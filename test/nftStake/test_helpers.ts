const fs = require("fs");
import { boolean } from "hardhat/internal/core/params/argumentTypes";

enum God {
    Hermes=0, Aphrodite, Zeus, Artemis, Poseidon, Hera, 
    Hephaestus, Apollo, Dionysus, Athena, Ares, Hades
  }

enum SingleReward {
    COSMIC=0,
    GLOW,
    SAME_SET,
    LEGENDARY_SYNERGY
}

enum Type {
    Default, Curated, Community, Honorary, Legendary
  }

enum Attributes {
    COSMIC=0,
    GLOW=1
  }

let AttributeBits = [1,2];

export interface PieceInfo{
    Type: number;
    God: number;
    Attributes: number;
    Set: number;
}

export interface Rewards{
    god_reward: Array<number>;
    type_reward: Array<number>;
    single_rewards: Array<number>;
    coupling_rewards: Array<number>;
}

const DECIMALS = 10**18;

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
    [God.Zeus, God.Poseidon, God.Hades]
];


export function loadJSON(filename:string){
    let res = JSON.parse(fs.readFileSync(__dirname + '/' + filename, "utf8"));
    return res;
}

/**
* @dev True if all elements in `gods_list` are greater than 0 in `staked_gods`
*/
export function godsListMatches(gods_list:Array<number>, staked_gods:Array<number>):boolean {
        let matched = true;

        for (let j=0; j < gods_list.length; j++) {
            if (gods_list[j] != 255 && (staked_gods[gods_list[j]] <= 0 || staked_gods[gods_list[j]] == undefined)) {
                matched = false;
                break;
                }
            }
        return matched;
}
    

export function localComputeYield(stakedNFTs:Array<PieceInfo>, rewards:Rewards): BigInt{
    let staked_gods: number[] = [];
    let staked_sets: number[] = [];
  
    let localYield = 0;
    
    // First we list all unique gods and sets and 
    for (let i=0; i < stakedNFTs.length; i++) {

        staked_gods[stakedNFTs[i].God]? staked_gods[stakedNFTs[i].God] += 1: staked_gods[stakedNFTs[i].God] = 1;

        if (stakedNFTs[i].Set != 255) {
            staked_sets[stakedNFTs[i].Set]? staked_sets[stakedNFTs[i].Set] += 1: staked_sets[stakedNFTs[i].Set] = 1;
        }
  
        // Add to the localYield the base reward for each god and type (Curated, Legendary, etc.)
        localYield += rewards.god_reward[stakedNFTs[i].God] * DECIMALS;
        localYield += rewards.type_reward[stakedNFTs[i].Type] * DECIMALS;
  
        // Add to the localYield the reward for each attribute we care about
        for(let attr_counter = 0; attr_counter < AttributeBits.length; attr_counter++) {
           if ((stakedNFTs[i].Attributes & AttributeBits[attr_counter]) > 0) {
            localYield += rewards.single_rewards[attr_counter - 1] * DECIMALS;
          }
        }
      
    }
  
    // If we have more than 1 god of a set, add the set reward
    for (let i = 0; i < staked_sets.length; i++) {
      if (staked_sets[i] > 0){
        localYield += rewards.single_rewards[SingleReward.SAME_SET] * DECIMALS * staked_sets[i];
      }
    }
  
    // Add the god + god combination reward
    for (let i=0; i < couplings.length; i++) {

        if (godsListMatches(couplings[i], staked_gods)) {
            localYield += rewards.coupling_rewards[i] * DECIMALS;
          }
    }

    // count the number of gods we have more than 0 of
    let num_gods = 0;

    for (let i=0; i < staked_gods.length; i++) {
        if (staked_gods[i] > 0) {
            num_gods += 1;
        }
    }

    // Dionysus & anyone else
    if (staked_gods[God.Dionysus] > 0 && num_gods > 1){
        localYield += rewards.coupling_rewards[11] * DECIMALS;
    }

    // Legendary & anyone else
    if (num_gods > 1){
        for (let i=0; i < stakedNFTs.length; i++) {

          if (stakedNFTs[i].Type == Type.Legendary) {
              localYield += rewards.single_rewards[SingleReward.LEGENDARY_SYNERGY] * DECIMALS;
              break;
          }
       }
    }

    // Olympus: full house
    if (num_gods == 12) {
        localYield += rewards.coupling_rewards[12] * DECIMALS;
    }

    return BigInt(localYield);
  
  }