const fs = require("fs");
import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import { NftStake } from "../../typechain";
import { MockERC20 } from "../../typechain";
import { MockERC721 } from "../../typechain";

import { Signers } from "../types";

// test cases
import { shouldBehaveLikeNftStake } from "./NftStake.behavior";
import { loadJSON, Rewards } from "./test_helpers";
import { ethers } from "ethers";

const { deployContract } = hre.waffle;

const DECIMALS = 10 ** 18;

let testData = JSON.parse(fs.readFileSync(__dirname + "/contract_test_data.json", "utf8"));

describe("Unit tests", function () {
  before(async function () {
    this.signers = {} as Signers;

    const signers: SignerWithAddress[] = await hre.ethers.getSigners();
    this.signers.admin = signers[0];
    this.signers.user1 = signers[1];
    this.signers.user2 = signers[2];

    this.testData = testData;
    this.rewards = <Rewards>loadJSON("rewards.json");

    this.token_data = [this.testData.plain.Artemis];
  });

  describe("NFTStake", function () {
    beforeEach(async function () {
      // deploy erc20
      const erc20Artifact: Artifact = await hre.artifacts.readArtifact("MockERC20");
      this.erc20Token = <MockERC20>(
        await deployContract(this.signers.admin, erc20Artifact, [BigInt(10000000 * DECIMALS)])
      );

      // deploy erc721
      const erc721Artifact: Artifact = await hre.artifacts.readArtifact("MockERC721");
      this.nftToken = <MockERC721>await deployContract(this.signers.admin, erc721Artifact, []);

      // deploy NFTStake
      const nftStakeArtifact: Artifact = await hre.artifacts.readArtifact("NftStake");
      this.nftStake = <NftStake>(
        await deployContract(this.signers.admin, nftStakeArtifact, [
          this.nftToken.address,
          this.erc20Token.address,
          ethers.utils.hexZeroPad("0x00", 32),
          await this.signers.admin.getAddress(),
        ])
      );

      // unpause the initially paused contract
      await this.nftStake.connect(this.signers.admin).pauseDeposit(false);

      // Send erc20 balance to NFTStake
      const adminTokenInstance: MockERC20 = <MockERC20>await this.erc20Token.connect(this.signers.admin);
      await adminTokenInstance.transfer(
        this.nftStake.address,
        await adminTokenInstance.balanceOf(await this.signers.admin.getAddress()),
      );

      // Mint some NFTS
      const adminERC721Instance: MockERC721 = <MockERC721>await this.nftToken.connect(this.signers.admin);

      // user1 has tokenId 1
      // user2 has tokenId 2
      for (let i = 0; i < 20; i++) {
        await adminERC721Instance.mint(await this.signers.user1.getAddress(), "TokenURL " + (i + 1));
      }

      await adminERC721Instance.mint(await this.signers.user2.getAddress(), "TokenURL 21");
    });

    shouldBehaveLikeNftStake(testData);
  });
});
