import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaChest } from "../target/types/solana_chest";
import * as web3 from "@solana/web3.js";
import * as fs from "fs";
import {getAccount, createMint, mintTo, getOrCreateAssociatedTokenAccount, createSetAuthorityInstruction, AuthorityType, getMint, transfer} from "@solana/spl-token";
import { assert } from "console";
import { token } from "@project-serum/anchor/dist/cjs/utils";


async function createToken(connection: web3.Connection, keypair: web3.Keypair)  {
  const mint = await createMint(
    connection,
    keypair,
    keypair.publicKey,
    keypair.publicKey,
    0
    );
    const associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    keypair,
    mint,
    keypair.publicKey
  );
    await mintTo(
    connection,
    keypair,
    mint,
    associatedTokenAccount.address,
    keypair,
    1
  );
  let transaction = new web3.Transaction()
  .add(createSetAuthorityInstruction(
    mint,
    keypair.publicKey,
    AuthorityType.MintTokens,
    null
  ));
await web3.sendAndConfirmTransaction(connection, transaction, [keypair]);
const accountInfo = await getAccount(connection, associatedTokenAccount.address);
const token_account = accountInfo.address
console.log("Created Token Account:" + accountInfo.address.toString());
// 1
const mintInfo = await getMint(
    connection,
    mint
  );
const mint_address = mintInfo.address;
console.log("Token Mint Address:" + mintInfo.address.toString());

return [token_account, mint_address]
}

describe("solana_chest", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaChest as Program<SolanaChest>;
  const connection = new web3.Connection("http://127.0.0.1:8899", "confirmed");

  it("Create Token & Create Chest PDA", async () => {
    // Generate keypair for the new account
    const rawPayerKeypair = JSON.parse(fs.readFileSync("testuser.json", "utf-8"));
    const test_user = web3.Keypair.fromSecretKey(Buffer.from(rawPayerKeypair));

    const [token_address, token_mint] = await createToken(connection, test_user);

    const [newPDA, newPDA_bump] = await web3.PublicKey.findProgramAddressSync([
      anchor.utils.bytes.utf8.encode("chest"),
      token_mint.toBuffer()
    ],
      program.programId)

    console.log("PDA being created: " + newPDA.toString());

    const tx = await program.methods.createChest(newPDA_bump).accounts(
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

    const pda_info = await program.account.chestPda.fetch(newPDA)
    console.log("PDA: " + newPDA.toString())
    console.log("PDA Bump: " + pda_info.bump)
  });








  
 it("Create ATA for PDA", async () => {

    const rawPayerKeypair = JSON.parse(fs.readFileSync("testuser.json", "utf-8"));
    const test_user = web3.Keypair.fromSecretKey(Buffer.from(rawPayerKeypair));

    const [token_address, token_mint] = await createToken(connection, test_user)

    const [newPDA, newPDA_bump] = await web3.PublicKey.findProgramAddressSync([
      anchor.utils.bytes.utf8.encode("chest"),
      token_mint.toBuffer()
    ],
      program.programId)

    const tx = await program.methods.createChest(newPDA_bump).accounts(
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
    const pda_info = await program.account.chestPda.fetch(newPDA)
    console.log("PDA: " + newPDA.toString())
    console.log("PDA Bump: " + pda_info.bump)
    const token_program_id = new web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const at_program = new web3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

    
    const [test_token_account, test_token_mint] = await createToken(connection, test_user);

    const [new_token_account] = web3.PublicKey.findProgramAddressSync([newPDA.toBytes(),token_program_id.toBytes(), test_token_mint.toBytes()],at_program)



    const tx_ata = await program.methods.createAta().accounts(
      {
        payer: test_user.publicKey,
        newTokenAccount: new_token_account,
        chestPda: newPDA,
        mint: test_token_mint,
        tokenAccount: test_token_account,
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
    console.log("Created ATA: " + new_token_account + " for token: " + test_token_mint)

    
    console.log("Created ATA: " + new_token_account + " for token: " + test_token_mint)

    const transfer_tx = await transfer(
      connection,
      test_user,
      test_token_account,
      new_token_account,
      test_user.publicKey,
      1
  );
    await connection.confirmTransaction(transfer_tx)
    var auxAccountInfo = await connection.getParsedAccountInfo(new_token_account);
    console.log((auxAccountInfo.value.data as web3.ParsedAccountData).parsed)

    var newAccountInfo = await connection.getParsedAccountInfo(test_token_account);
    console.log((newAccountInfo.value.data as web3.ParsedAccountData).parsed)
    const [potential_new_ata] = web3.PublicKey.findProgramAddressSync([test_user.publicKey.toBytes(),token_program_id.toBytes(), test_token_mint.toBytes()],at_program)
    const withdraw_tx = await program.methods.withdrawToken().accounts(
      {
        fromAccount: newPDA,
        fromTokenAccount: new_token_account,
        to: potential_new_ata,
        tokenMint: test_token_mint,
        chestKey: token_mint
  
      }
    )
    .rpc()

    await connection.confirmTransaction(withdraw_tx)

    var auxAccountInfo = await connection.getParsedAccountInfo(new_token_account);
    console.log((auxAccountInfo.value.data as web3.ParsedAccountData).parsed)

    var newAccountInfo = await connection.getParsedAccountInfo(test_token_account);
    console.log((newAccountInfo.value.data as web3.ParsedAccountData).parsed) 
  })

  
});
