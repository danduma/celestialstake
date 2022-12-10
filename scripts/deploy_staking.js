async function main() {
   const NftStake = await ethers.getContractFactory("NftStake");

   const nft_address = "0xb5C48B932934B299Cf837D18753d1990a9B7722b";
   const erc20_address = "0x193AcA30704F0615B6444f565b42d7FE34f5A012";
   const attributes_root = "0xd3a897bb85dabfe225e8d23c64bb92c9d4998365a3e37795fd85201dadf6755e";
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