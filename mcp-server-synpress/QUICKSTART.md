# Synpress MCP Quick Start Guide

Get started with the Synpress MCP server in 5 minutes.

## Step 1: Install Dependencies

```bash
cd mcp-server-synpress
pnpm install
pnpm build
```

## Step 2: Download MetaMask Extension

1. Go to [MetaMask Releases](https://github.com/MetaMask/metamask-extension/releases)
2. Download the latest `metamask-chrome-*.zip` file
3. Extract it to a folder (e.g., `/home/user/metamask-extension`)
4. Note the full path to this folder

## Step 3: Configure Claude Desktop

Edit your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "synpress": {
      "command": "node",
      "args": [
        "/FULL/PATH/TO/synpress/mcp-server-synpress/dist/index.js"
      ]
    }
  }
}
```

Replace `/FULL/PATH/TO/` with the actual path to your synpress directory.

## Step 4: Restart Claude Desktop

Close and reopen Claude Desktop completely.

## Step 5: Test It Out

Start a conversation with Claude:

```
User: Can you help me test a Web3 application using Synpress?

Claude: I'd be happy to help! I have access to the Synpress MCP which allows me to:
- Control MetaMask wallet
- Automate blockchain transactions
- Test dApps
- Manage accounts and networks

To get started, I'll need to initialize a browser with MetaMask.
Do you have a test seed phrase you'd like to use?
```

## Example: Testing a DApp

### 1. Initialize and Setup

```
User: Initialize browser at /home/user/metamask-extension and import this test wallet:
"test test test test test test test test test test test junk"
with password "Test123!"
```

### 2. Navigate to DApp

```
User: Navigate to https://app.uniswap.org and connect my wallet
```

### 3. Perform Actions

```
User: Switch to Polygon network

User: When a transaction appears, approve it with market gas settings
```

### 4. Cleanup

```
User: Close the browser
```

## Common Operations

### Import Wallet

```json
Tool: import_wallet
{
  "seedPhrase": "your twelve or twenty-four word seed phrase here",
  "password": "YourPassword123!"
}
```

### Add Custom Network

```json
Tool: add_network
{
  "name": "Arbitrum One",
  "rpcUrl": "https://arb1.arbitrum.io/rpc",
  "chainId": 42161,
  "symbol": "ETH",
  "blockExplorerUrl": "https://arbiscan.io"
}
```

### Confirm Transaction with Custom Gas

```json
Tool: confirm_transaction
{
  "gasSetting": {
    "maxBaseFee": 50,
    "priorityFee": 2,
    "gasLimit": 21000
  }
}
```

### Approve Token with Limit

```json
Tool: approve_token
{
  "spendLimit": "1000",
  "gasSetting": "market"
}
```

## Test Wallet Resources

### Test Seed Phrases

**Default Hardhat/Anvil**:
```
test test test test test test test test test test test junk
```

**MetaMask Test Phrase** (DO NOT use for real funds):
```
Already know what your twelve word seed phrase words are? Use a test phrase!
```

### Test Networks

- **Sepolia**: Ethereum testnet (ChainID: 11155111)
- **Mumbai**: Polygon testnet (ChainID: 80001)
- **Goerli**: Ethereum testnet (ChainID: 5)

### Get Test Funds

- Sepolia: https://sepoliafaucet.com
- Mumbai: https://faucet.polygon.technology
- Goerli: https://goerlifaucet.com

## Troubleshooting

### MCP Server Not Appearing in Claude

1. Check the config file path is correct
2. Verify JSON syntax is valid (use a JSON validator)
3. Ensure the path to `index.js` is absolute, not relative
4. Restart Claude Desktop completely (quit from menu, not just close window)

### "Browser not initialized" Error

Always call `initialize_browser` first:

```
User: Initialize browser with MetaMask at /path/to/metamask-extension
```

### Extension Not Loading

1. Verify the path to MetaMask extension is correct
2. Make sure it's the extracted folder, not the .zip file
3. Check folder permissions (should be readable)

### Timeout Errors

Some operations take time on real networks. For testing:
1. Use local networks (Anvil, Hardhat)
2. Use test networks with less congestion
3. Increase timeout values if needed

## Advanced Usage

### Running Local Blockchain

For faster testing, use a local blockchain:

```bash
# Install Anvil
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Start local node
anvil
```

Then connect to `http://127.0.0.1:8545` (ChainID: 31337)

### Environment Variables

Create a `.env` file for sensitive data:

```bash
METAMASK_EXTENSION_PATH=/home/user/metamask-extension
TEST_SEED_PHRASE="test test test test test test test test test test test junk"
TEST_PASSWORD="Test123!"
```

Never commit this file to version control!

## Next Steps

- Read the full [README.md](./README.md) for all available tools
- Check [Synpress Documentation](https://docs.synpress.io) for advanced features
- Join the [Discord community](https://discord.gg/synthetix) for support

## Security Reminder

- **Never use real seed phrases or private keys**
- **Only use test wallets** with test funds
- **Run in isolated environments** for testing
- **Store credentials securely** (use environment variables or secrets management)

Happy testing! 🚀
