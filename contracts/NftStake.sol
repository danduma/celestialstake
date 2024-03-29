// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

import "hardhat/console.sol";

//   enum CoupleReward {
//     Monarchs,
//     Twins,
//     FielsAndForests,
//     SkyAndSea,
//     SkyAndSoul,
//     SeaAndSoul,
//     SkySeaAndSoul,
//     LoveAndHaste,
//     LoveAndSpite,
//     LoveAndWar,
//     GodsOfWar,
//     JoyOfWine,
//     Pantheon
// }



contract NftStake is IERC721Receiver, ReentrancyGuard {
    using SafeMath for uint256;

    uint256 private constant SECONDS_IN_DAY = 24 * 60 * 60;
    uint8 private constant NUM_COUPLING_REWARDS = 13;
    
    uint256 private constant MAX_INT = 10000000;

    uint8 private constant AttributeCosmic = 1;
    uint8 private constant AttributeGlow = 2;

    enum SingleReward {
        COSMIC,
        GLOW,
        SAME_SET,
        LEGENDARY_SYNERGY
    }

    enum Attributes {
        COSMIC,
        GLOW
    }

    uint8[2] private AttributeBits = [1, 2];

    enum God {
        Hermes,
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
        Hades
    }

    enum Type {
        Default,
        Curated,
        Community,
        Honorary,
        Legendary
    }

    IERC721 public nftToken;
    IERC20 public erc20Token;
    uint256 public minStakingTime = 7 days;

    bool public depositPaused;

    // Admin / owner / controller address
    address private admin;
    bytes32 private attributesRoot; // root of the Merkle tree that validates encoded NFT attributes 

    uint256 private constant DECIMALS = 10**18;

    // Hermes, Aphrodite, Zeus, Artemis, Poseidon, Hera, Hephaestus, Apollo,
    // Dionysus, Athena, Ares, Hades
    uint256[12] public god_reward = [115, 100, 100, 110, 125, 160, 170, 180, 175, 200, 250, 500];
    // Default, Curated, Community, Honorary, Legendary
    uint256[5] public type_reward = [0, 200, 200, 200, 700];
    // Cosmic, Glow, Same Set, Legendary Synergy
    uint256[4] public single_rewards = [25, 15, 100, 200];
    // last 3: (Zeus, Poseidon, Hades), Dionysus + any, Olympus
    uint256[NUM_COUPLING_REWARDS] public coupling_rewards = [
        130,
        130,
        75,
        75,
        150,
        175,
        75,
        130,
        100,
        150,
        275,
        50,
        1000
    ];

    uint256[2][10] public couplings = [
        [uint256(God.Zeus), uint256(God.Hera)],
        [uint256(God.Artemis), uint256(God.Apollo)],
        [uint256(God.Artemis), uint256(God.Hermes)],
        [uint256(God.Zeus), uint256(God.Poseidon)],
        [uint256(God.Zeus), uint256(God.Hades)],
        [uint256(God.Poseidon), uint256(God.Hades)],
        [uint256(God.Aphrodite), uint256(God.Hermes)],
        [uint256(God.Aphrodite), uint256(God.Hephaestus)],
        [uint256(God.Aphrodite), uint256(God.Ares)],
        [uint256(God.Athena), uint256(God.Ares)]
    ];

    struct Staker {
        uint256 currentYield; // how much is being generated per unit of time (day)
        uint256 accumulatedAmount; // how much was accumulated at lastCheckpoint time
        uint256 lastCheckpoint; // last time (in seconds) that payout was accumulated
        // mapping(uint256 => uint256) stakingTime; // last staking time, per NFT
        uint256[] stakingTime; // last staking time, per NFT
        uint256[] stakedNFTs; // list of NFTs staked by this staker
    }

    struct PieceInfo {
        uint8 God;
        uint8 Type;
        uint8 Attributes;
        uint8 Set;
    }

    // TokenID => Stake
    mapping(address => Staker) public stakers;
    mapping(uint256 => PieceInfo) public pieceInfo;
    mapping(uint256 => address) public ownerOfToken;

    // Events
    event NftStaked(address indexed staker, uint256[] tokenIds, uint256 blockNumber);
    event NftUnStaked(address indexed staker, uint256[] tokenIds, uint256 blockNumber);
    event StakePayout(
        address indexed staker,
        uint256[] tokenIds,
        uint256 stakeAmount,
        uint256 fromTime,
        uint256 toTime
    );
    event WithdrawStuckERC721(address indexed receiver, uint256 tokenId);
    event StakeRewardUpdated();

    modifier requireTimeElapsed(address staker) {
        // require that some time has elapsed (IE you can not Stake and unstake in the same block)
        require(
            stakers[staker].lastCheckpoint < block.timestamp,
            "requireTimeElapsed: Can not Stake/unStake/harvest in same block"
        );
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Caller is not the admin");
        _;
    }

    constructor(
        IERC721 _nftToken,
        IERC20 _erc20Token,
        bytes32 _attributesRoot,
        address _admin
    ) {
        nftToken = _nftToken;
        erc20Token = _erc20Token;
        attributesRoot = _attributesRoot;
        admin = _admin;
        depositPaused = true;
    }

    /**
     *  Allows updating the admin of the contract
     */
    function transferAdmin(address newadmin) public onlyAdmin {
        admin = newadmin;
    }

    /**
     *  Always returns `IERC721Receiver.onERC721Received.selector`.
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    /**
     *  Updates the staker's current yield and the checkpoint time.
     */
    function accumulate(address staker) internal {
        stakers[staker].accumulatedAmount += getPendingReward(staker);
        stakers[staker].lastCheckpoint = block.timestamp;
    }

    function _setTokensValues(uint256[] memory tokenIds, PieceInfo[] memory tokenTraits) internal {
        require(tokenIds.length == tokenTraits.length, "Wrong arrays provided");

        for (uint256 i; i < tokenIds.length; i++) {
            pieceInfo[tokenIds[i]] = tokenTraits[i];
        }
    }

    function stakeNFT(uint256[] calldata tokenIds, PieceInfo[] calldata tokenTraits, bytes32[][] calldata proofs) public nonReentrant {
        require(!depositPaused, "Deposit paused");

        require(tokenIds.length == tokenTraits.length, "Wrong arrays provided");

        if (tokenTraits.length > 0) {
            for (uint32 i=0; i < tokenIds.length; i++) {
                require(_validateProof(tokenIds[i], tokenTraits[i], proofs[i]), 
                "Invalid data provided");
            }

            _setTokensValues(tokenIds, tokenTraits);
        }

        address _msgSender = msg.sender;

        Staker storage user = stakers[_msgSender];

        for (uint256 i; i < tokenIds.length; i++) {
            require(nftToken.ownerOf(tokenIds[i]) == _msgSender, "Caller is not owner of NFT");

            nftToken.safeTransferFrom(_msgSender, address(this), tokenIds[i]);

            ownerOfToken[tokenIds[i]] = _msgSender;
            user.stakedNFTs.push(tokenIds[i]);
            user.stakingTime.push(block.timestamp);
        }

        accumulate(_msgSender);
        user.currentYield = computeYield(_msgSender);
        stakers[_msgSender] = user;

        emit NftStaked(_msgSender, tokenIds, block.number);
    }

    /**
     *  Moves around elements in a list so we can delete an element
     */
    function _moveTokenInTheList(uint256[] memory list, uint256 tokenId) internal pure returns (uint256[] memory) {
        uint256 tokenIndex = 0;
        uint256 lastTokenIndex = list.length - 1;
        uint256 length = list.length;

        for (uint256 i = 0; i < length; i++) {
            if (list[i] == tokenId) {
                tokenIndex = i + 1;
                break;
            }
        }
        require(tokenIndex != 0, "msg.sender is not the owner");

        tokenIndex -= 1;

        if (tokenIndex != lastTokenIndex) {
            list[tokenIndex] = list[lastTokenIndex];
            list[lastTokenIndex] = tokenId;
        }

        return list;
    }

    /**
     *  UNSTAKE NFTs from the staking contract.
     */
    function unStakeNFT(uint256[] memory tokenIds) public nonReentrant {
        address _msgSender = msg.sender;

        Staker storage user = stakers[_msgSender];
        uint256 newYield = user.currentYield;

        accumulate(_msgSender);
        _payoutStake(_msgSender);

        user.accumulatedAmount = 0;
        user.lastCheckpoint = block.timestamp;

        for (uint256 i; i < tokenIds.length; i++) {
            require(elementInArray(user.stakedNFTs, tokenIds[i]), "NFT not staked by the caller");

            require(nftToken.ownerOf(tokenIds[i]) == address(this), "Not in staking contract");

            uint256 index = indexInArray(user.stakedNFTs,tokenIds[i]);

            require(user.stakingTime[index] + minStakingTime <= block.timestamp, "NFT still locked up in staking");

            delete ownerOfToken[tokenIds[i]];

            user.stakingTime[index] = tokenIds[i];
            user.stakedNFTs = _moveTokenInTheList(user.stakedNFTs, tokenIds[i]);
            user.stakedNFTs.pop();
            user.stakingTime = _moveTokenInTheList(user.stakingTime, tokenIds[i]);
            user.stakingTime.pop();

            if (user.currentYield != 0) {
                newYield = computeYield(_msgSender);
            }

            nftToken.safeTransferFrom(address(this), _msgSender, tokenIds[i]);
        }

        if (user.stakedNFTs.length == 0) {
            delete stakers[_msgSender];
        } else {
            user.currentYield = newYield;
            stakers[_msgSender] = user;
        }

        emit NftUnStaked(_msgSender, tokenIds, block.number);
    }

    /**
     *  External function to harvest the generated yield
     */
    function harvest(address staker) public nonReentrant requireTimeElapsed(staker) {
        require(msg.sender == staker, "Only the staker can harvest");

        // This 'payout first' should be safe as the function is nonReentrant
        _payoutStake(staker);

        // update user's yield and timestamp
        stakers[staker].accumulatedAmount = 0;
        stakers[staker].lastCheckpoint = block.timestamp;
    }

    /**
     *  Withdraw leftover yield token in the contract to the admin's wallet
     */
    function reclaimYieldTokens() external onlyAdmin {
        erc20Token.transfer(admin, erc20Token.balanceOf(address(this)));
    }

    /**
     *  Main function to compute a given staker's daily yield
     */
    function computeYield(address _staker) public view returns (uint256) {
        uint256[12] memory staked_gods;
        uint256[30] memory staked_sets;

        uint256 yield = 0;

        // First we collect all unique gods and sets and add the corresponding yield
        for (uint256 i; i < stakers[_staker].stakedNFTs.length; i++) {
            uint256 tokenId = stakers[_staker].stakedNFTs[i];

            staked_gods[pieceInfo[tokenId].God] += 1;
            if (pieceInfo[tokenId].Set != 255) {
                staked_sets[pieceInfo[tokenId].Set] += 1;
            }

            // Add to the yield the base reward for each god and type (Curated, Legendary, etc.)
            yield += god_reward[pieceInfo[tokenId].God];
            yield += type_reward[pieceInfo[tokenId].Type];

            // Add to the yield the reward for each attribute we care about
            for (uint8 attr_counter = 0; attr_counter < AttributeBits.length; attr_counter++) {
                if ((pieceInfo[tokenId].Attributes & AttributeBits[attr_counter]) > 0) {
                    
                    // console.log("ADDING ATTRIBUTE REWARD", attr_counter, AttributeBits[attr_counter], single_rewards[attr_counter]);
                    
                    yield += single_rewards[attr_counter];
                }
            }
        }

        // count the number of unique gods we have more than 0 of
        uint256 num_gods = 0;

        for (uint256 i; i < staked_gods.length; i++) {
            if (staked_gods[i] > 0) {
                num_gods += 1;
            }
        }

        // IFF more than 1 god staked, we should check for sets 
        if (num_gods > 1){
            // If we have more than 1 god of a set, add the set reward
            for (uint256 i; i < staked_sets.length; i++) {
                if (staked_sets[i] > 0) {
                    // console.log("ADDING SET REWARD", i, staked_sets[i]);
                    // console.log(single_rewards[uint256(SingleReward.SAME_SET)]);
                    yield += single_rewards[uint256(SingleReward.SAME_SET)] * staked_sets[i];
                }
            }
        }

        // Next part of the function is made a second function because the EVM implementation is retarded
        yield += computeCouplingsYield(staked_gods, _staker, num_gods);

        return yield * DECIMALS;
    }

    /**
     *  Splintered from computeYield() to get around code complexity issues
     */
    function computeCouplingsYield(uint256[12] memory staked_gods, address _staker, uint256 num_gods) public view returns (uint256) {
        uint256 yield = 0;
        
        if (num_gods > 1) {
            // Add the god + god combination reward
            for (uint256 i; i < couplings.length; i++) {
                // this is fucking retarded, but Solidity won't let you cast a static array
                // to a dynamic array
                uint256[] memory gods_list = new uint256[](couplings[i].length);
                for (uint256 j; j < couplings[i].length; j++) {
                    gods_list[j] = couplings[i][j];
                }

                if (godsListMatches(gods_list, staked_gods)) {
                    // console.log("ADDING COUPLING REWARD", i);
                    // console.log(coupling_rewards[i]);

                    yield += coupling_rewards[i];
                }
            }

            // sky, sea and soul. Only "coupling" of 3
            uint256[] memory gods_list3 = new uint256[](3);
            gods_list3[0] = uint256(God.Zeus);
            gods_list3[1] = uint256(God.Poseidon);
            gods_list3[2] = uint256(God.Hades);

            if (godsListMatches(gods_list3, staked_gods)) {
                // console.log("ADDING 3-COUPLING REWARD");
                // console.log(coupling_rewards[10]);

                yield += coupling_rewards[10];
            }

            // Dionysus & anyone else
            if (staked_gods[uint256(God.Dionysus)] > 0 && num_gods > 1) {
                // console.log("ADDING COUPLING REWARD: Dionysus");
                // console.log(coupling_rewards[11]);

                yield += coupling_rewards[11];
            }

            // Legendary & anyone else
            for (uint256 i; i < stakers[_staker].stakedNFTs.length; i++) {
                uint256 tokenId = stakers[_staker].stakedNFTs[i];

                if (pieceInfo[tokenId].Type == uint8(Type.Legendary)) {
                    // console.log("ADDING COUPLING REWARD: Legendary");
                    // console.log(coupling_rewards[11]);

                    yield += single_rewards[uint256(SingleReward.LEGENDARY_SYNERGY)];
                    break;
                }
            }

            // Olympus: full house
            if (num_gods == 12) {
                // console.log("ADDING COUPLING REWARD: Olympus");
                // console.log(coupling_rewards[12]);

                yield += coupling_rewards[12];
        }
        }



        return yield;
    }

    /**
     *  Returns the outstanding reward for a given staker since lastCheckpoint.
     */
    function getPendingReward(address staker) public view returns (uint256) {
        Staker memory user = stakers[staker];
        if (user.lastCheckpoint == 0) {
            return 0;
        }

        uint256 timeElapsed = (block.timestamp - user.lastCheckpoint);
        uint256 pendingReward = timeElapsed * (user.currentYield.div(SECONDS_IN_DAY));
        return pendingReward;
    }

    // function listStakedNFTs(address staker) public view returns (uint256[] memory) {
    //     return stakers[staker].stakedNFTs;        
    // }

    function _payoutStake(address staker) internal {
        /* NOTE : Must be called from non-reentrant function to be safe!*/

        // double check that the receipt exists and we're not staking from block 0
        require(stakers[staker].lastCheckpoint > 0, "_payoutStake: Can not Stake from time 0");

        // earned amount is difference between the Stake start block, current block multiplied by Stake amount
        Staker memory user = stakers[staker];

        uint256 payout = getPendingReward(staker) + user.accumulatedAmount;

        // If contract does not have enough tokens to pay out, return the NFT without payment
        // This prevent a NFT being locked in the contract when empty
        if (erc20Token.balanceOf(address(this)) < payout) {
            // console.log("Not enough tokens to pay out (!!)");
            emit StakePayout(msg.sender, user.stakedNFTs, 0, user.lastCheckpoint, block.timestamp);
            return;
        }

        // payout Stake
        erc20Token.transfer(staker, payout);

        emit StakePayout(msg.sender, user.stakedNFTs, payout, user.lastCheckpoint, block.timestamp);
    }

    /**
     *  Function allows admin withdraw ERC721 in case of emergency.
     */
    function emergencyWithdraw(uint256[] memory tokenIds) public onlyAdmin {
        require(tokenIds.length <= 50, "50 is max per tx");
        pauseDeposit(true);
        for (uint256 i; i < tokenIds.length; i++) {
            address receiver = ownerOfToken[tokenIds[i]];

            if (receiver != address(0) && nftToken.ownerOf(tokenIds[i]) == address(this)) {
                nftToken.transferFrom(address(this), receiver, tokenIds[i]);
                delete ownerOfToken[tokenIds[i]];
                emit WithdrawStuckERC721(receiver, tokenIds[i]);
            }
        }
    }

    /**
     *  Function to update the reward constants
     */
    function setRewards(
        uint256[12] memory _god_reward,
        uint256[5] memory _type_reward,
        uint256[4] memory _single_rewards,
        uint256[NUM_COUPLING_REWARDS] memory _coupling_rewards
    ) public {
        god_reward = _god_reward;
        type_reward = _type_reward;
        single_rewards = _single_rewards;
        coupling_rewards = _coupling_rewards;
        emit StakeRewardUpdated();
    }

    /**
     *  Function allows to pause deposits if needed. Withdraw remains active.
     */
    function pauseDeposit(bool _pause) public onlyAdmin {
        depositPaused = _pause;
    }

    function setAttributesRoot(bytes32 _attributesRoot) public onlyAdmin {
        attributesRoot = _attributesRoot;
    }

    function setMinStakingTime(uint256 time) public onlyAdmin {
        minStakingTime = time;
    }

    function getNFTStaked(address staker) public view returns(uint256[] memory) { 
        return stakers[staker].stakedNFTs; 
    }

    //// =============== UTILITY FUNCTIONS =================

    /**
     *  True if a given element is in the array
     */
    function elementInArray(uint256[] memory list, uint256 tokenId) internal pure returns (bool) {
        // if (indexInArray(list, tokenId) == -1) 
        //     { return false; }
        // else
        //     { return true; };
        return (indexInArray(list, tokenId) != MAX_INT);
    }
    
    function indexInArray(uint256[] memory list, uint256 tokenId) internal pure returns (uint256) {
        uint256 length = list.length;

        for (uint256 i = 0; i < length; i++) {
            if (list[i] == tokenId) {
                return i;
            }
        }

        return MAX_INT;
    }
    
    

    /**
     *  True if all elements in `gods_list` are greater than 0 in `staked_gods`
     */
    function godsListMatches(uint256[] memory gods_list, uint256[12] memory staked_gods) internal pure returns (bool) {
        if (gods_list.length == 0 || staked_gods.length == 0) {
            return false;
        }

        for (uint256 j; j < gods_list.length; j++) {
            if (gods_list[j] != 255 && (staked_gods[gods_list[j]] == 0)) {
                return false;
            }
        }
        return true;
    }

    // Validate
    function _validateProof(uint256 index, PieceInfo memory item,bytes32[] memory proof) public view returns (bool)
    {
        bytes memory packed = abi.encodePacked(index, item.Type, item.God, item.Attributes, item.Set);
        bytes32 computedHash = keccak256(packed);

        // console.logBytes(" === validating proof ===");
        // console.logBytes(packed);
        // console.log(" ");
        // console.logBytes32(computedHash);

        return MerkleProof.verify(proof, attributesRoot, computedHash);
  }
}
