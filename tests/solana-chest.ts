import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaChest } from "../target/types/solana_chest";
import * as web3 from "@solana/web3.js";
import * as fs from "fs";
import {getAccount, createMint, mintTo, getOrCreateAssociatedTokenAccount, createSetAuthorityInstruction, AuthorityType, getMint} from "@solana/spl-token";
import { assert } from "console";
import { token } from "@project-serum/anchor/dist/cjs/utils";

describe("solana_chest", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaChest as Program<SolanaChest>;
  const connection = new web3.Connection("http://127.0.0.1:8899", "confirmed");

  it("Create Token & Create Chest PDA", async () => {
    // Generate keypair for the new account
    const rawPayerKeypair = JSON.parse(fs.readFileSync("testuser.json", "utf-8"));
    const test_user = web3.Keypair.fromSecretKey(Buffer.from(rawPayerKeypair));

    const mint = await createMint(
    connection,
    test_user,
    test_user.publicKey,
    test_user.publicKey,
    0
    );
    const associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    test_user,
    mint,
    test_user.publicKey
  );
    await mintTo(
    connection,
    test_user,
    mint,
    associatedTokenAccount.address,
    test_user,
    1
  );
  let transaction = new web3.Transaction()
  .add(createSetAuthorityInstruction(
    mint,
    test_user.publicKey,
    AuthorityType.MintTokens,
    null
  ));
await web3.sendAndConfirmTransaction(connection, transaction, [test_user]);
const accountInfo = await getAccount(connection, associatedTokenAccount.address);
console.log("Token Account:" + accountInfo.address.toString());
console.log("Token Amount:" + accountInfo.amount.toString());
// 1
const mintInfo = await getMint(
    connection,
    mint
  );
  console.log("Mint Address:" + mintInfo.address.toString());
    // Send transaction

    const token_mint = mintInfo.address;
    const token_address = accountInfo.address;
    const [newPDA] = await web3.PublicKey.findProgramAddressSync([
      anchor.utils.bytes.utf8.encode("chest"),
      token_mint.toBuffer()
    ],
      program.programId)

    console.log("PDA being created: " + newPDA.toString());

    const tx = await program.methods.createChest().accounts(
      {
        nftMint: token_mint,
        nftTokenAccount: token_address,
        newAccount: newPDA,
        user: test_user.publicKey,
        systemProgram: web3.SystemProgram.programId
      }
    ).signers(
      [test_user]
    ).rpc()
    console.log("TX: " + tx.toString())

    const pda_info = await program.account.chestPda.getAccountInfo(newPDA);
    console.log(pda_info);
    assert(pda_info.lamports > 0, "Account initialized")
  });

 it("Create ATA for PDA", async () => {

    const rawPayerKeypair = JSON.parse(fs.readFileSync("testuser.json", "utf-8"));
    const test_user = web3.Keypair.fromSecretKey(Buffer.from(rawPayerKeypair));

    const mint = await createMint(
    connection,
    test_user,
    test_user.publicKey,
    test_user.publicKey,
    0
    );
    const associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    test_user,
    mint,
    test_user.publicKey
  );
    await mintTo(
    connection,
    test_user,
    mint,
    associatedTokenAccount.address,
    test_user,
    1
  );
  let transaction = new web3.Transaction()
  .add(createSetAuthorityInstruction(
    mint,
    test_user.publicKey,
    AuthorityType.MintTokens,
    null
  ));
await web3.sendAndConfirmTransaction(connection, transaction, [test_user]);
const accountInfo = await getAccount(connection, associatedTokenAccount.address);
console.log("Token Account:" + accountInfo.address.toString());
console.log("Token Amount:" + accountInfo.amount.toString());
// 1
const mintInfo = await getMint(
    connection,
    mint
  );
  console.log("Mint Address:" + mintInfo.address.toString());
    // Send transaction

    const token_mint = mintInfo.address;
    const token_address = accountInfo.address;
    const [newPDA] = await web3.PublicKey.findProgramAddressSync([
      anchor.utils.bytes.utf8.encode("chest"),
      token_mint.toBuffer()
    ],
      program.programId)

    console.log("PDA being created: " + newPDA.toString());

    const tx = await program.methods.createChest().accounts(
      {
        nftMint: token_mint,
        nftTokenAccount: token_address,
        newAccount: newPDA,
        user: test_user.publicKey,
        systemProgram: web3.SystemProgram.programId
      }
    ).signers(
      [test_user]
    ).rpc()
    console.log("TX: " + tx.toString())
    
    const token_program_id = new web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const at_program = new web3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

    const [new_token_account] = web3.PublicKey.findProgramAddressSync([newPDA.toBytes(),token_program_id.toBytes(), token_mint.toBytes()],at_program)

    const tx_ata = await program.methods.createAta().accounts(
      {
        payer: test_user.publicKey,
        newTokenAccount: new_token_account,
        chestPda: newPDA,
        mint: token_mint,
        tokenAccount: token_address,
        tokenProgram: token_program_id,
        systemProgram: web3.SystemProgram.programId,
        associatedTokenProgram: at_program,
        rent: web3.SYSVAR_RENT_PUBKEY
        
      }
    ).signers([
      test_user
    ]).rpc()
    console.log("TX: " + tx_ata.toString())
    await connection.confirmTransaction(tx_ata)
    const ata_account_info = await connection.getParsedAccountInfo(new_token_account);
    console.log(ata_account_info.value.data)
  
  })

});
