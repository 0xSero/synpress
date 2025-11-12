# Synpress MCP Server

Model Context Protocol (MCP) server for [Synpress](https://synpress.io) - enables AI models to perform browser automation, cryptocurrency wallet management, and blockchain operations.

## What is this?

This MCP server exposes Synpress's powerful browser automation and wallet testing capabilities to AI assistants like Claude. It allows AI models to:

- **Control MetaMask wallet**: Import wallets, manage accounts, switch networks
- **Automate transactions**: Confirm, reject, and monitor blockchain transactions
- **Sign messages**: Handle message signing and EIP-712 typed data
- **Manage tokens**: Approve token spending, add custom tokens
- **Interact with dApps**: Connect wallets, approve network switches
- **Browser automation**: Navigate pages, click elements, fill forms
- **Test crypto applications**: Full end-to-end testing capabilities for Web3 apps

## Installation

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- MetaMask browser extension (downloaded locally)

### Install Dependencies

```bash
cd mcp-server-synpress
pnpm install
pnpm build
```

## Configuration

### For Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "synpress": {
      "command": "node",
      "args": [
        "/absolute/path/to/synpress/mcp-server-synpress/dist/index.js"
      ]
    }
  }
}
```

### For Claude Code / Other MCP Clients

Configure your MCP client to run:

```bash
node /path/to/mcp-server-synpress/dist/index.js
```

## Usage

### Getting MetaMask Extension

Before using the MCP, you need the MetaMask extension:

1. Download from [MetaMask releases](https://github.com/MetaMask/metamask-extension/releases)
2. Extract the ZIP file
3. Note the path to the extracted directory

### Basic Workflow

1. **Initialize browser** with MetaMask extension
2. **Import wallet** using seed phrase
3. **Perform operations** (transactions, signatures, etc.)
4. **Close browser** when done

### Example Conversation with Claude

```
User: Initialize a browser with MetaMask and import my test wallet

Claude: I'll initialize the browser with MetaMask.
[Uses: initialize_browser with extensionPath]
[Uses: import_wallet with test seed phrase and password]

User: Navigate to Uniswap and connect my wallet

Claude: I'll navigate to Uniswap and connect your wallet.
[Uses: navigate_to_url with https://app.uniswap.org]
[Uses: click_element to click "Connect Wallet"]
[Uses: connect_to_dapp to approve connection]

User: Switch to Polygon network

Claude: I'll switch to the Polygon network.
[Uses: switch_network with "Polygon"]

User: Approve the transaction that's pending

Claude: I'll approve the pending transaction.
[Uses: confirm_transaction]
```

## Available Tools

### Browser & Wallet Setup

- `initialize_browser` - Start browser with MetaMask extension
- `import_wallet` - Import wallet from seed phrase
- `unlock_wallet` - Unlock MetaMask with password
- `lock_wallet` - Lock MetaMask wallet

### Account Management

- `add_account` - Create new account from seed
- `import_account_from_private_key` - Import account via private key
- `switch_account` - Switch between accounts
- `get_account_address` - Get current account address
- `rename_account` - Rename current account

### Network Management

- `add_network` - Add custom RPC network
- `switch_network` - Switch to different network

### Transaction Operations

- `confirm_transaction` - Approve pending transaction
- `reject_transaction` - Reject pending transaction
- `confirm_transaction_and_wait` - Approve and wait for mining

### Signature Operations

- `sign_message` - Sign simple message
- `sign_typed_data` - Sign EIP-712 typed data
- `reject_signature` - Reject signature request

### Token Operations

- `approve_token` - Approve token spending allowance
- `reject_token_approval` - Reject token approval
- `add_token` - Add custom token to wallet

### DApp Interaction

- `connect_to_dapp` - Connect wallet to dApp
- `approve_network_switch` - Approve network switch request
- `reject_network_switch` - Reject network switch request
- `approve_add_network` - Approve add network request
- `reject_add_network` - Reject add network request

### Page Navigation

- `navigate_to_url` - Navigate to URL
- `click_element` - Click element by CSS selector
- `fill_input` - Fill input field
- `get_page_content` - Get text content from page

### Advanced Operations

- `reset_account` - Reset account activity and nonce
- `enable_eth_sign` - Enable eth_sign (UNSAFE - testing only)
- `provide_encryption_key` - Provide public encryption key
- `decrypt_message` - Decrypt encrypted message

### Cleanup

- `close_browser` - Close browser and cleanup

## Use Cases

### Automated Testing

```
Test a DeFi protocol:
1. Initialize browser with test wallet
2. Navigate to protocol interface
3. Connect wallet
4. Perform swap transaction
5. Verify transaction confirmation
6. Check updated balances
```

### Wallet Management

```
Manage multiple accounts:
1. Import main wallet
2. Create additional accounts
3. Switch between accounts
4. Add custom networks (L2s, testnets)
5. Import specific accounts via private key
```

### Transaction Monitoring

```
Monitor and approve transactions:
1. Connect to dApp
2. Wait for transaction prompts
3. Review gas settings
4. Approve or reject based on criteria
5. Wait for blockchain confirmation
```

### Token Management

```
Handle token approvals:
1. Navigate to DEX
2. Initiate token swap
3. Approve token spending with custom limits
4. Confirm swap transaction
5. Add received token to wallet
```

## Architecture

### Built With

- **@modelcontextprotocol/sdk** - MCP server implementation
- **@synthetixio/synpress-metamask** - MetaMask automation
- **playwright** - Browser automation
- **TypeScript** - Type-safe implementation

### How It Works

1. MCP server runs as a stdio process
2. AI assistant sends tool requests via MCP protocol
3. Server translates requests to Synpress/Playwright actions
4. Browser automation executes the actions
5. Results are returned to the AI assistant

## Security Considerations

### Important Warnings

- **Never use real seed phrases or private keys** with this MCP in production
- **Only use test wallets** with test funds for automation
- **Extension paths** should point to verified MetaMask releases
- **eth_sign is UNSAFE** - only enable for testing purposes

### Best Practices

1. Use test networks (Sepolia, Mumbai, etc.)
2. Use dedicated test wallets with limited funds
3. Store seed phrases securely (environment variables, secrets management)
4. Run in isolated environments for testing
5. Review all transactions before approval

## Troubleshooting

### "Browser not initialized" Error

Make sure to call `initialize_browser` first before any other operations.

### Extension Not Loading

Verify the `extensionPath` points to a valid MetaMask extension directory.

### Transaction Timeouts

Some operations may take longer on congested networks. The default timeout is 30 seconds but can be adjusted.

### MetaMask Not Responding

The wallet may be in a locked state. Try calling `unlock_wallet` with your password.

## Development

### Build from Source

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm build

# Run in development mode with watch
pnpm dev
```

### Testing

Test the MCP server with a test wallet:

```bash
# Set up test environment
export METAMASK_EXTENSION_PATH=/path/to/metamask
export TEST_SEED_PHRASE="test test test test test test test test test test test junk"

# Run the server
pnpm start
```

## Contributing

Contributions are welcome! Please see the main [Synpress repository](https://github.com/Synthetixio/synpress) for contribution guidelines.

## Resources

- [Synpress Documentation](https://docs.synpress.io)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [MetaMask Documentation](https://docs.metamask.io)
- [Playwright Documentation](https://playwright.dev)

## License

MIT - See LICENSE file for details

## Support

- [GitHub Issues](https://github.com/Synthetixio/synpress/issues)
- [Documentation](https://docs.synpress.io)
- [Discord Community](https://discord.gg/synthetix)

---

**Built with Synpress** - The most advanced E2E testing framework for Web3 applications.
