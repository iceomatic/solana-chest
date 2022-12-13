import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaChest } from "../target/types/solana_chest";
import * as web3 from "@solana/web3.js";

describe("solana-chest", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaChest as Program<SolanaChest>;

  it("Is initialized!", async () => {
    /*
    // Generate keypair for the new account
    const mint = await createMint(
    program.connection,
    program.wallet.keypair,
    program.wallet.publicKey,
    program.wallet.publicKey,
    0
    );

    const associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
    program.connection,
    program.wallet.keypair,
    mint,
    program.wallet.publicKey
  );

    await mintTo(
    program.connection,
    program.wallet.keypair,
    mint,
    associatedTokenAccount.address,
    program.wallet.keypair,
    1
  );
  let transaction = new Transaction()
  .add(createSetAuthorityInstruction(
    mint,
    program.wallet.publicKey,
    AuthorityType.MintTokens,
    null
  ));

await web3.sendAndConfirmTransaction(program.connection, transaction, [program.wallet.keypair]);
const accountInfo = await getAccount(program.connection, associatedTokenAccount.address);

console.log(await accountInfo.amount);
// 1
const mintInfo = await getMint(
    program.connection,
    mint
  );

console.log(await mintInfo);
    // Send transaction
  });
  */
    const token_mint = new web3.PublicKey("GrtCUVQSKuwhtULMgopacQdg69tvqvF24mXZuN4ScsyR")
    const token_address = new web3.PublicKey("EZ6Vm4sHjXiiMQT4a7nd5Hgnra2YSS5LjK8BXj6MfJ75")
    const [newPDA] = await web3.PublicKey.findProgramAddress([
      anchor.utils.bytes.utf8.encode("chest"),
      token_mint.toBuffer()
    ],
      program.programId)

    console.log(newPDA.toString());

    const tx = await program.methods.createChest().accounts(
      {
        nftMint: token_mint,
        nftTokenAccount: token_address,
        newAccount: newPDA,
        user: program.wallet.publicKey,
        systemProgram: web3.SystemProgram.programId
      }
    ).signers(
      [program.wallet.keypair]
    ).rpc()
    console.log(tx)
  });
});
