
import fs from 'fs';
import crypto from 'crypto';
import { Keypair, Connection, Transaction, SystemProgram, PublicKey, TransactionInstruction } from '@solana/web3.js';

const KEYPAIR_FILE = 'wallet-keypair.json';

function hashString(str) {
  const hash = crypto.createHash('sha256');
  hash.update(str);
  return hash.digest('hex');
}

async function loadOrCreateKeypair() {
  if (fs.existsSync(KEYPAIR_FILE)) {
    const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_FILE));
    return { keypair: Keypair.fromSecretKey(new Uint8Array(keypairData)), isNew: false };
  } else {
    const newKeypair = Keypair.generate();
    fs.writeFileSync(KEYPAIR_FILE, JSON.stringify(Array.from(newKeypair.secretKey)));
    return { keypair: newKeypair, isNew: true };
  }
}

async function main() {
  // Load or create a wallet keypair
  const { keypair: wallet, isNew } = await loadOrCreateKeypair();
  console.log('Wallet public key:', wallet.publicKey.toString());

  // Connect to the Solana devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Request an airdrop of SOL to the wallet if it's newly created
  if (isNew) {
    const airdropSignature = await connection.requestAirdrop(
      wallet.publicKey,
      1000000000, // 1 SOL in lamports
    );
    await connection.confirmTransaction(airdropSignature);
    console.log('Airdrop successful!');
  }

  await testSendData(connection, wallet);

  // Check the wallet balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('Wallet balance:', balance / 1000000000, 'SOL');

 // Retrieve the transaction signatures for the wallet
  const signatures = await connection.getConfirmedSignaturesForAddress2(wallet.publicKey);
  console.log('Transaction signatures:', signatures);

}

async function testSendData(connection, wallet) {
  
  // Create a transaction with data and send it to yourself
  const data = hashString('Hello Nenrin');
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: wallet.publicKey,
      lamports: 0,
    }),
  );

  transaction.add(new TransactionInstruction({
    keys: [],
    programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
    data: Buffer.from(data),
  }));

  const signature = await connection.sendTransaction(transaction, [wallet]);
  await connection.confirmTransaction(signature);
  console.log('Transaction sent with data:', data);

}
main().catch(console.error);

