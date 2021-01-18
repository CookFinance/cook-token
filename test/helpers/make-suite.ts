import { ethers, waffle } from "hardhat";
import {Signer, Wallet} from "ethers";
import {Cook} from "../../typechain";
const { deployContract } = waffle;
import CookArtifact from "../../artifacts/contracts/Cook.sol/Cook.json";

export interface SignerWithAddress {
    signer: Signer;
    address: string;
}

export const getEthersSigners = async (): Promise<Signer[]> =>
    await Promise.all(await ethers.getSigners());

export interface TestEnv {
    deployer: SignerWithAddress;
    users: SignerWithAddress[];
    cook: Cook;
}

const testEnv: TestEnv = {
    deployer: {} as SignerWithAddress,
    users: [] as SignerWithAddress[],
    cook: {} as Cook,
} as TestEnv;

export async function initializeMakeSuite() {
    const [_deployer, ...restSigners] = await getEthersSigners();
    const deployer: SignerWithAddress = {
        address: await _deployer.getAddress(),
        signer: _deployer,
    };
    for (const signer of restSigners) {
        testEnv.users.push({
            signer,
            address: await signer.getAddress(),
        });
    }
    testEnv.deployer = deployer;
    testEnv.cook = await (await deployContract(
        <Wallet>_deployer,
        CookArtifact
    )) as Cook;
}

export function makeSuite(name: string, tests: (testEnv: TestEnv) => void) {
    describe(name, () => {
        tests(testEnv);
    });
}