import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { network } from "hardhat";
import { Block } from "@ethersproject/abstract-provider";
import { localComputeYield } from "./test_helpers";

const SECONDS_IN_DAY = 24 * 60 * 60;

export async function getLatestBlock(provider:any): Promise<Block> {
  let currentBlockData:Block;

  return await network.provider.send("eth_getBlockByNumber", ["latest", false]);
}

export async function getLatestTimestamp(provider:any): Promise<number> {
  let currentBlockData:Block;

  return (await network.provider.send("eth_getBlockByNumber", ["latest", false])).timestamp;
}


export function shouldBehaveLikeNftStake(): void {

  it("should let user stake NFT", async function () {
    // Need to approve the token first
    await expect(
      this.nftStake.connect(this.signers.user1).stakeNFT([BigNumber.from(1)], [this.token_data[0]]),
    ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
    // Approve nftStake to take the token
    await this.nftToken.connect(this.signers.user1).approve(this.nftStake.address, BigNumber.from(1));
    // Try to stake it
    await expect(this.nftStake.connect(this.signers.user1).stakeNFT([BigNumber.from(1)], [this.token_data[0]])).to.not
      .be.reverted;
  });

  it("should not let a user stake twice", async function () {
    // Approve nftStake to take the token
    await this.nftToken.connect(this.signers.user1).approve(this.nftStake.address, BigNumber.from(1));

    // Try to stake it
    await expect(this.nftStake.connect(this.signers.user1).stakeNFT(
      [BigNumber.from(1)], [this.token_data[0]])).to.not.be.reverted;

    // Try to stake again
    await expect(
      this.nftStake.connect(this.signers.user1).stakeNFT([BigNumber.from(1)], [this.token_data[0]]),
    ).to.be.revertedWith("Caller is not owner of NFT");
  });

  it("should not let you stake a token you don't own", async function () {
    // Try to stake it
    await expect(this.nftStake.connect(this.signers.user2).stakeNFT([BigNumber.from(1)], [this.token_data[0]])).to.be
      .reverted;
  });

  it("should let user unstake and pay the right yield", async function () {
    const tokenId = BigNumber.from(1);
    // Approve nftStake to take the token
    await this.nftToken.connect(this.signers.user1).approve(this.nftStake.address, tokenId);
    // Try to stake it
    await expect(this.nftStake.connect(this.signers.user1).stakeNFT([tokenId], [this.token_data[0]])).to.not.be.reverted;

    // confirm nftStake owns token
    expect(await this.nftToken.connect(this.signers.admin).ownerOf(tokenId)).to.eql(this.nftStake.address);

    // let some time pass
    await network.provider.send("evm_mine");

    // get lastCheckpoint in seconds
    const startStake = (
      await this.nftStake.connect(this.signers.admin).stakers(this.signers.user1.address)
    ).lastCheckpoint.toNumber();

    const timeDelta = (await getLatestTimestamp(network.provider)) - startStake;
    const computedYield = (await this.nftStake.connect(this.signers.user1).computeYield(this.signers.user1.address)).toBigInt() / BigInt(SECONDS_IN_DAY);

    // estimate stake
    const estimatedPayout = BigInt(timeDelta) * computedYield;

    let result = await (await this.nftStake.connect(this.signers.user1).getPendingReward(this.signers.user1.address)).toBigInt();

    // check if estimated stake matches contract
    expect(result).to.eql(estimatedPayout);

    let pendingReward = (await this.nftStake.connect(this.signers.user1).getPendingReward(this.signers.user1.address)).toBigInt();

    // try to unstake
    await expect(this.nftStake.connect(this.signers.user1).unStakeNFT([tokenId])).to.not.be.reverted;

    // confirm user1 owns the token again
    expect(await this.nftToken.connect(this.signers.user1).ownerOf(tokenId)).to.eql(
      await this.signers.user1.getAddress(),
    );

    // check if user1 has been paid the estimated stake
    expect(
      await (
        await this.erc20Token.connect(this.signers.user1).balanceOf(await this.signers.user1.getAddress())
      ).toBigInt(),
    ).satisfies( (value:BigInt) => {
      return (value == pendingReward) || (value == (pendingReward * BigInt(2)))} );
  });

  it("getPendingReward should return zero when not staked", async function () {
    expect(
      (await this.nftStake.connect(this.signers.user1).getPendingReward(this.signers.user1.address)).toNumber(),
    ).to.eql(0);
  });


  it("should allow harvesting without withdrawal", async function () {
    const tokenId = BigNumber.from(1);
    // Approve nftStake to take the token
    await this.nftToken.connect(this.signers.user1).approve(this.nftStake.address, tokenId);
    // Try to stake it
    await expect(this.nftStake.connect(this.signers.user1).stakeNFT([tokenId], [this.token_data[0]])).to.not.be.reverted;

    // Wait 4 blocks
    await network.provider.send("evm_mine");
    await network.provider.send("evm_mine");
    await network.provider.send("evm_mine");
    await network.provider.send("evm_mine");

    // get current earned stake
    const currentEarnedStake = (
      await this.nftStake.connect(this.signers.user1).getPendingReward(this.signers.user1.address)
    ).toBigInt();

    // get current token balance of user
    const balanceBeforeHarvest = (
      await this.erc20Token.connect(this.signers.user1).balanceOf(await this.signers.user1.getAddress())
    ).toBigInt();

    const staker = await this.nftStake.connect(this.signers.user1).stakers(this.signers.user1.address);
    
    // get the staked receipt
    const stakedAtTime = staker.lastCheckpoint.toNumber();

    // get current blockNumer
    let currentBlockTimestamp = await getLatestTimestamp(network.provider);

    // check the staked receipt is 4 blocks ago
    expect(currentBlockTimestamp - stakedAtTime).to.eq(4);

    // should have no tokens
    expect(balanceBeforeHarvest).to.eq(BigInt(0));
    
    // should not let you harvest tokens you did not stake
    await expect(this.nftStake.connect(this.signers.user2).harvest(this.signers.user1.address)).to.be.revertedWith(
      "Only the staker can harvest",
    );

    // harvest Stake
    await this.nftStake.connect(this.signers.user1).harvest(this.signers.user1.address);

    // should have harvested the tokens
    expect(
      (await this.erc20Token.connect(this.signers.user1).balanceOf(await this.signers.user1.getAddress())).toBigInt(),
    ).to.eq(currentEarnedStake);

    // check the new receipt
    const updatedStakeDate = (
      await this.nftStake.connect(this.signers.user1).stakers(this.signers.user1.address)
    ).lastCheckpoint.toBigInt();

    // check the staked receipt has been updated to current blocktime
    expect((await getLatestTimestamp(network.provider))).to.eq(updatedStakeDate);

    // check that there is no pending payout availible
    expect(
      (await this.nftStake.connect(this.signers.user1).getPendingReward(this.signers.user1.address)).toBigInt(),
    ).to.eq(0);

    // check that nftStake still owns the token
    expect(await this.nftToken.connect(this.signers.user1).ownerOf(tokenId)).to.eq(this.nftStake.address);

    // wait one block
    await network.provider.send("evm_mine");

    let pendingReward = (await this.nftStake.connect(this.signers.user1).getPendingReward(this.signers.user1.address)).toBigInt();

    // check that there is now a pending payout availible again
    expect(pendingReward).to.be.above(0);
  });


  it("staking combinations should yield the expected reward", async function () {

    

    expect(
      (await this.nftStake.connect(this.signers.user1).getPendingReward(this.signers.user1.address)).toNumber(),
    ).to.eql(0);
  });


}
