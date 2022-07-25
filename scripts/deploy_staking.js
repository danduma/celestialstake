async function main() {
   const NftStake = await ethers.getContractFactory("NftStake");

   const nft_address = "0xb5C48B932934B299Cf837D18753d1990a9B7722b";
   const erc20_address = "0x193AcA30704F0615B6444f565b42d7FE34f5A012";
   const attributes_root = "0x15804ce24892e7aa75f7b1c4245ba76d643c2af808630b1e66605a82db855339";
   const admin = "0x57f5Ab4B82726a153396430dd45f3d1667DC335B";
   
   // Start deployment, returning a promise that resolves to a contract object
   const contract = await NftStake.deploy(nft_address, erc20_address, attributes_root,admin);   
   console.log("Contract deployed to address:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });