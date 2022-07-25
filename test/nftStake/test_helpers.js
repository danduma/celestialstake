"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.generateMerkleTree = exports.localComputeYield = exports.godsListMatches = exports.loadJSON = void 0;
var fs = require("fs");
var merkletreejs_1 = require("merkletreejs");
var keccak256_1 = __importDefault(require("keccak256"));
var ethers_1 = require("ethers");
var console_1 = require("console");
var God;
(function (God) {
    God[God["Hermes"] = 0] = "Hermes";
    God[God["Aphrodite"] = 1] = "Aphrodite";
    God[God["Zeus"] = 2] = "Zeus";
    God[God["Artemis"] = 3] = "Artemis";
    God[God["Poseidon"] = 4] = "Poseidon";
    God[God["Hera"] = 5] = "Hera";
    God[God["Hephaestus"] = 6] = "Hephaestus";
    God[God["Apollo"] = 7] = "Apollo";
    God[God["Dionysus"] = 8] = "Dionysus";
    God[God["Athena"] = 9] = "Athena";
    God[God["Ares"] = 10] = "Ares";
    God[God["Hades"] = 11] = "Hades";
})(God || (God = {}));
var SingleReward;
(function (SingleReward) {
    SingleReward[SingleReward["COSMIC"] = 0] = "COSMIC";
    SingleReward[SingleReward["GLOW"] = 1] = "GLOW";
    SingleReward[SingleReward["SAME_SET"] = 2] = "SAME_SET";
    SingleReward[SingleReward["LEGENDARY_SYNERGY"] = 3] = "LEGENDARY_SYNERGY";
})(SingleReward || (SingleReward = {}));
var Type;
(function (Type) {
    Type[Type["Default"] = 0] = "Default";
    Type[Type["Curated"] = 1] = "Curated";
    Type[Type["Community"] = 2] = "Community";
    Type[Type["Honorary"] = 3] = "Honorary";
    Type[Type["Legendary"] = 4] = "Legendary";
})(Type || (Type = {}));
var Attributes;
(function (Attributes) {
    Attributes[Attributes["COSMIC"] = 0] = "COSMIC";
    Attributes[Attributes["GLOW"] = 1] = "GLOW";
})(Attributes || (Attributes = {}));
var AttributeBits = [1, 2];
var DECIMALS = Math.pow(10, 18);
var couplings = [
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
function loadJSON(filename) {
    var res = JSON.parse(fs.readFileSync(__dirname + "/" + filename, "utf8"));
    return res;
}
exports.loadJSON = loadJSON;
/**
 *  True if all elements in `gods_list` are greater than 0 in `staked_gods`
 */
function godsListMatches(gods_list, staked_gods) {
    if (gods_list.length == 0 || staked_gods.length == 0) {
        return false;
    }
    for (var j = 0; j < gods_list.length; j++) {
        if (gods_list[j] != 255 && (staked_gods[gods_list[j]] <= 0 || staked_gods[gods_list[j]] == undefined)) {
            return false;
        }
    }
    return true;
}
exports.godsListMatches = godsListMatches;
function localComputeYield(stakedNFTs, rewards) {
    var staked_gods = [];
    var staked_sets = [];
    var localYield = 0;
    // First we list all unique gods and sets and
    for (var i = 0; i < stakedNFTs.length; i++) {
        staked_gods[stakedNFTs[i].God] ? (staked_gods[stakedNFTs[i].God] += 1) : (staked_gods[stakedNFTs[i].God] = 1);
        if (stakedNFTs[i].Set != 255) {
            staked_sets[stakedNFTs[i].Set] ? (staked_sets[stakedNFTs[i].Set] += 1) : (staked_sets[stakedNFTs[i].Set] = 1);
        }
        // Add to the localYield the base reward for each god and type (Curated, Legendary, etc.)
        localYield += rewards.god_reward[stakedNFTs[i].God];
        localYield += rewards.type_reward[stakedNFTs[i].Type];
        // Add to the localYield the reward for each attribute we care about, e.g. cosmic plating
        for (var attr_counter = 0; attr_counter < AttributeBits.length; attr_counter++) {
            if ((stakedNFTs[i].Attributes & AttributeBits[attr_counter]) > 0) {
                localYield += rewards.single_rewards[attr_counter];
            }
        }
    }
    // count the number of gods we have more than 0 of
    var num_gods = 0;
    for (var i = 0; i < staked_gods.length; i++) {
        if (staked_gods[i] > 0) {
            num_gods += 1;
        }
    }
    // IFF more than 1 god staked, we should check for sets and combinations
    if (num_gods > 1) {
        // If we have more than 1 god of a set, add the set reward
        for (var i = 0; i < staked_sets.length; i++) {
            if (staked_sets[i] > 0) {
                localYield += rewards.single_rewards[SingleReward.SAME_SET] * staked_sets[i];
            }
        }
        // Add the god + god combination reward
        for (var i = 0; i < couplings.length; i++) {
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
            for (var i = 0; i < stakedNFTs.length; i++) {
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
exports.localComputeYield = localComputeYield;
function generateMerkleTree(stakedNFTs, contract, offset) {
    if (offset === void 0) { offset = 0; }
    return __awaiter(this, void 0, void 0, function () {
        var result, leaves, buf2hex, tree, index, hexroot, leaf, hexproof, computed_proofs;
        return __generator(this, function (_a) {
            (0, console_1.assert)(stakedNFTs.length > 0, "No NFTs to generate Merkle tree from");
            result = { root: "", leaves: Array() };
            leaves = stakedNFTs.map(function (item, index) {
                // let packed = ethers.utils.solidityKeccak256(
                var packed = ethers_1.ethers.utils.solidityPack(["uint256", "uint8", "uint8", "uint8", "uint8"], [index + offset, item.Type, item.God, item.Attributes, item.Set]);
                var hashed = (0, keccak256_1["default"])(packed);
                return hashed;
            });
            buf2hex = function (x) { return "0x" + x.toString("hex"); };
            tree = new merkletreejs_1.MerkleTree(leaves, keccak256_1["default"], { sort: true });
            index = 0;
            hexroot = tree.getHexRoot();
            leaf = leaves[index];
            hexproof = tree.getHexProof(leaf);
            // console.log("verifying with merkletreejs:");
            // console.log(tree.verify(hexproof, leaf!, hexroot)); // true
            // check that the tree validates locally
            (0, console_1.assert)(tree.verify(hexproof, leaf, hexroot));
            computed_proofs = Array();
            leaves.map(function (data) {
                // const addr_hexproof = tree.getProof(data!).map((x:any) => buf2hex(x.data));
                var addr_hexproof = tree.getHexProof(data);
                computed_proofs.push(addr_hexproof);
            });
            result["root"] = tree.getHexRoot();
            result["leaves"] = computed_proofs;
            return [2 /*return*/, result];
        });
    });
}
exports.generateMerkleTree = generateMerkleTree;
