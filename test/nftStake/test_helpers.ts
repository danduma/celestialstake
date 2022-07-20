const fs = require("fs");

import { AbiCoder } from "@ethersproject/abi";

import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { BigNumber, ethers, utils } from "ethers";
import { soliditySha3, encodePacked } from "web3-utils";
import { assert } from "console";

enum God {
  Hermes = 0,
  Aphrodite,
  Zeus,
  Artemis,
  Poseidon,
  Hera,
  Hephaestus,
  Apollo,
  Dionysus,
  Athena,
  Ares,
  Hades,
}

enum SingleReward {
  COSMIC = 0,
  GLOW,
  SAME_SET,
  LEGENDARY_SYNERGY,
}

enum Type {
  Default,
  Curated,
  Community,
  Honorary,
  Legendary,
}

enum Attributes {
  COSMIC = 0,
  GLOW = 1,
}

let AttributeBits = [1, 2];

export interface PieceInfo {
  Type: number;
  God: number;
  Attributes: number;
  Set: number;
}

export interface Rewards {
  god_reward: Array<number>;
  type_reward: Array<number>;
  single_rewards: Array<number>;
  coupling_rewards: Array<number>;
}

const DECIMALS = 10 ** 18;

const couplings = [
  [God.Zeus, God.Hera],
  [God.Artemis, God.Apollo],
  [God.Artemis, God.Hermes],
  [God.Zeus, God.Poseidon],
  [God.Zeus, God.Hades],
  [God.Poseidon, God.Hades],
  [God.Aphrodite, God.Hermes],
  [God.Aphrodite, God.Hephaestus],
  [God.Aphrodite, God.Ares],
  [God.Athena, God.Ares],
  [God.Zeus, God.Poseidon, God.Hades],
];

export function loadJSON(filename: string) {
  let res = JSON.parse(fs.readFileSync(__dirname + "/" + filename, "utf8"));
  return res;
}

/**
 *  True if all elements in `gods_list` are greater than 0 in `staked_gods`
 */
export function godsListMatches(gods_list: Array<number>, staked_gods: Array<number>): boolean {
  if (gods_list.length == 0 || staked_gods.length == 0) {
    return false;
  }

  for (let j = 0; j < gods_list.length; j++) {
    if (gods_list[j] != 255 && (staked_gods[gods_list[j]] <= 0 || staked_gods[gods_list[j]] == undefined)) {
      return false;
    }
  }
  return true;
}

export function localComputeYield(stakedNFTs: Array<PieceInfo>, rewards: Rewards): BigInt {
  let staked_gods: number[] = [];
  let staked_sets: number[] = [];

  let localYield = 0;

  // First we list all unique gods and sets and
  for (let i = 0; i < stakedNFTs.length; i++) {
    staked_gods[stakedNFTs[i].God] ? (staked_gods[stakedNFTs[i].God] += 1) : (staked_gods[stakedNFTs[i].God] = 1);

    if (stakedNFTs[i].Set != 255) {
      staked_sets[stakedNFTs[i].Set] ? (staked_sets[stakedNFTs[i].Set] += 1) : (staked_sets[stakedNFTs[i].Set] = 1);
    }

    // Add to the localYield the base reward for each god and type (Curated, Legendary, etc.)
    localYield += rewards.god_reward[stakedNFTs[i].God];
    localYield += rewards.type_reward[stakedNFTs[i].Type];

    // Add to the localYield the reward for each attribute we care about, e.g. cosmic plating
    for (let attr_counter = 0; attr_counter < AttributeBits.length; attr_counter++) {
      if ((stakedNFTs[i].Attributes & AttributeBits[attr_counter]) > 0) {
        localYield += rewards.single_rewards[attr_counter];
      }
    }
  }

  // count the number of gods we have more than 0 of
  let num_gods = 0;

  for (let i = 0; i < staked_gods.length; i++) {
    if (staked_gods[i] > 0) {
      num_gods += 1;
    }
  }

  // IFF more than 1 god staked, we should check for sets and combinations
  if (num_gods > 1) {
    // If we have more than 1 god of a set, add the set reward
    for (let i = 0; i < staked_sets.length; i++) {
      if (staked_sets[i] > 0) {
        localYield += rewards.single_rewards[SingleReward.SAME_SET] * staked_sets[i];
      }
    }

    // Add the god + god combination reward
    for (let i = 0; i < couplings.length; i++) {
      if (godsListMatches(couplings[i], staked_gods)) {
        localYield += rewards.coupling_rewards[i];
      }
    }

    // Dionysus & anyone else
    if (staked_gods[God.Dionysus] > 0 && num_gods > 1) {
      localYield += rewards.coupling_rewards[11];
    }

    // Legendary & anyone else
    if (num_gods > 1) {
      for (let i = 0; i < stakedNFTs.length; i++) {
        if (stakedNFTs[i].Type == Type.Legendary) {
          localYield += rewards.single_rewards[SingleReward.LEGENDARY_SYNERGY];
          break;
        }
      }
    }

    // Olympus: full house
    if (num_gods == 12) {
      localYield += rewards.coupling_rewards[12];
    }
  }

  return BigInt(localYield * DECIMALS);
}

export async function generateMerkleTree(stakedNFTs: Array<PieceInfo>, contract: any, offset:number = 0): Promise<any> {
  assert(stakedNFTs.length > 0, "No NFTs to generate Merkle tree from");

  let result = { root: "", leaves: Array() };
  // Create merkle tree proofs

  const leaves = stakedNFTs.map(function (item, index) {
    // let packed = ethers.utils.solidityKeccak256(
    let packed = ethers.utils.solidityPack(
      ["uint256", "uint8", "uint8", "uint8", "uint8"],
      [index + offset, item.Type, item.God, item.Attributes, item.Set],
    );

    let hashed = keccak256(packed);
    return hashed;
  });

  const buf2hex = (x: any) => "0x" + x.toString("hex");

  const tree = new MerkleTree(leaves, keccak256, { sort: true });

  const index = 0;

  const hexroot = tree.getHexRoot();
  const leaf = leaves[index];
  const hexproof = tree.getHexProof(leaf!);

  // console.log("verifying with merkletreejs:");
  // console.log(tree.verify(hexproof, leaf!, hexroot)); // true

  // check that the tree validates locally
  assert(tree.verify(hexproof, leaf!, hexroot));

  // console.log("\n\nverifying with contract:"); // true
  // let contract_res = await contract.verify(hexroot, index, stakedNFTs[index], hexproof);
  // console.log(contract_res); // true

  let computed_proofs = Array();

  leaves.map(data => {
    // const addr_hexproof = tree.getProof(data!).map((x:any) => buf2hex(x.data));
    const addr_hexproof = tree.getHexProof(data!);

    computed_proofs.push(addr_hexproof);
  });

  result["root"] = tree.getHexRoot();
  result["leaves"] = computed_proofs;

  return result;
}
