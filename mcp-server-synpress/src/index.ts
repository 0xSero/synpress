#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { chromium, type Page, type BrowserContext } from 'playwright';
import { MetaMask } from '@synthetixio/synpress-metamask/playwright';

// Server state
let context: BrowserContext | null = null;
let page: Page | null = null;
let metamask: MetaMask | null = null;

const TOOLS: Tool[] = [
  // Browser & Wallet Setup
  {
    name: 'initialize_browser',
    description: 'Initialize browser with MetaMask extension. This must be called first before using any other tools.',
    inputSchema: {
      type: 'object',
      properties: {
        headless: {
          type: 'boolean',
          description: 'Run browser in headless mode (default: false)',
          default: false,
        },
        extensionPath: {
          type: 'string',
          description: 'Path to MetaMask extension (optional, will download if not provided)',
        },
      },
    },
  },
  {
    name: 'import_wallet',
    description: 'Import wallet using seed phrase and set up password',
    inputSchema: {
      type: 'object',
      properties: {
        seedPhrase: {
          type: 'string',
          description: '12 or 24 word seed phrase',
        },
        password: {
          type: 'string',
          description: 'Password for wallet',
        },
      },
      required: ['seedPhrase', 'password'],
    },
  },
  {
    name: 'unlock_wallet',
    description: 'Unlock MetaMask wallet with password',
    inputSchema: {
      type: 'object',
      properties: {
        password: {
          type: 'string',
          description: 'Wallet password',
        },
      },
      required: ['password'],
    },
  },
  {
    name: 'lock_wallet',
    description: 'Lock MetaMask wallet',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // Account Management
  {
    name: 'add_account',
    description: 'Create a new account from the same seed phrase',
    inputSchema: {
      type: 'object',
      properties: {
        accountName: {
          type: 'string',
          description: 'Name for the new account',
        },
      },
      required: ['accountName'],
    },
  },
  {
    name: 'import_account_from_private_key',
    description: 'Import an account using a private key',
    inputSchema: {
      type: 'object',
      properties: {
        privateKey: {
          type: 'string',
          description: 'Private key to import (with or without 0x prefix)',
        },
      },
      required: ['privateKey'],
    },
  },
  {
    name: 'switch_account',
    description: 'Switch to a different account by name or index',
    inputSchema: {
      type: 'object',
      properties: {
        accountNameOrIndex: {
          type: ['string', 'number'],
          description: 'Account name or index (0-based)',
        },
      },
      required: ['accountNameOrIndex'],
    },
  },
  {
    name: 'get_account_address',
    description: 'Get the current account address',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'rename_account',
    description: 'Rename an account',
    inputSchema: {
      type: 'object',
      properties: {
        currentName: {
          type: 'string',
          description: 'Current name of the account',
        },
        newName: {
          type: 'string',
          description: 'New name for the account',
        },
      },
      required: ['currentName', 'newName'],
    },
  },

  // Network Management
  {
    name: 'add_network',
    description: 'Add a custom RPC network to MetaMask',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Network name',
        },
        rpcUrl: {
          type: 'string',
          description: 'RPC URL',
        },
        chainId: {
          type: 'number',
          description: 'Chain ID',
        },
        symbol: {
          type: 'string',
          description: 'Currency symbol (e.g., ETH, MATIC)',
        },
        blockExplorerUrl: {
          type: 'string',
          description: 'Block explorer URL (optional)',
        },
      },
      required: ['name', 'rpcUrl', 'chainId', 'symbol'],
    },
  },
  {
    name: 'switch_network',
    description: 'Switch to a different network',
    inputSchema: {
      type: 'object',
      properties: {
        network: {
          type: 'string',
          description: 'Network name or chain ID',
        },
        waitForNewNetwork: {
          type: 'boolean',
          description: 'Wait for network to fully switch (default: true)',
          default: true,
        },
      },
      required: ['network'],
    },
  },

  // Transaction Operations
  {
    name: 'confirm_transaction',
    description: 'Confirm a pending transaction in MetaMask',
    inputSchema: {
      type: 'object',
      properties: {
        gasSetting: {
          type: ['string', 'object'],
          description: 'Gas setting: "low", "market", "aggressive", "site", or custom {maxBaseFee, priorityFee, gasLimit}',
        },
      },
    },
  },
  {
    name: 'reject_transaction',
    description: 'Reject a pending transaction in MetaMask',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'confirm_transaction_and_wait',
    description: 'Confirm transaction and wait for it to be mined on blockchain',
    inputSchema: {
      type: 'object',
      properties: {
        gasSetting: {
          type: ['string', 'object'],
          description: 'Gas setting: "low", "market", "aggressive", "site", or custom object',
        },
      },
    },
  },

  // Signature Operations
  {
    name: 'sign_message',
    description: 'Sign a simple message (eth_sign or personal_sign)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'sign_typed_data',
    description: 'Sign structured EIP-712 typed data (signTypedData)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'reject_signature',
    description: 'Reject a signature request',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // Token Operations
  {
    name: 'approve_token',
    description: 'Approve token spending allowance',
    inputSchema: {
      type: 'object',
      properties: {
        spendLimit: {
          type: ['string', 'number'],
          description: 'Spend limit amount or "max" for unlimited',
        },
        gasSetting: {
          type: ['string', 'object'],
          description: 'Gas setting for approval transaction',
        },
      },
    },
  },
  {
    name: 'reject_token_approval',
    description: 'Reject a token approval request',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'add_token',
    description: 'Add a custom token to MetaMask (wallet_watchAsset)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // DApp Interaction
  {
    name: 'connect_to_dapp',
    description: 'Connect MetaMask to a dapp (approve connection request)',
    inputSchema: {
      type: 'object',
      properties: {
        accounts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific accounts to connect (optional)',
        },
      },
    },
  },
  {
    name: 'approve_network_switch',
    description: 'Approve a network switch request from dapp',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'reject_network_switch',
    description: 'Reject a network switch request from dapp',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'approve_add_network',
    description: 'Approve adding a new network requested by dapp',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'reject_add_network',
    description: 'Reject adding a new network requested by dapp',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // Page Navigation
  {
    name: 'navigate_to_url',
    description: 'Navigate browser to a specific URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to navigate to',
        },
        waitUntil: {
          type: 'string',
          description: 'Wait until: "load", "domcontentloaded", "networkidle" (default: "load")',
          enum: ['load', 'domcontentloaded', 'networkidle'],
          default: 'load',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'click_element',
    description: 'Click an element on the page using CSS selector',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for element to click',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 30000)',
          default: 30000,
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'fill_input',
    description: 'Fill an input field on the page',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for input element',
        },
        value: {
          type: 'string',
          description: 'Value to fill',
        },
      },
      required: ['selector', 'value'],
    },
  },
  {
    name: 'get_page_content',
    description: 'Get text content from page using CSS selector',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for element to get content from',
        },
      },
      required: ['selector'],
    },
  },

  // Advanced Operations
  {
    name: 'reset_account',
    description: 'Reset account activity and nonce',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'enable_eth_sign',
    description: 'Enable eth_sign method (UNSAFE - only for testing)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'provide_encryption_key',
    description: 'Provide public encryption key for eth_getEncryptionPublicKey',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'decrypt_message',
    description: 'Decrypt an encrypted message',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // Cleanup
  {
    name: 'close_browser',
    description: 'Close browser and cleanup resources',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

const server = new Server(
  {
    name: 'synpress-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'initialize_browser': {
        const { headless = false, extensionPath } = args as any;

        // Download MetaMask extension if not provided
        // For now, we'll require the extension path
        if (!extensionPath) {
          throw new Error('extensionPath is required. Download MetaMask extension and provide the path.');
        }

        context = await chromium.launchPersistentContext('', {
          headless,
          args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--disable-blink-features=AutomationControlled',
          ],
        });

        page = context.pages()[0] || await context.newPage();

        // Initialize MetaMask instance
        // We'll set password and extensionId later during import
        metamask = new MetaMask(
          context,
          page,
          '', // password - will be set during import
          '' // extensionId - will be auto-detected
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Browser initialized with MetaMask extension',
              }),
            },
          ],
        };
      }

      case 'import_wallet': {
        if (!metamask) throw new Error('Browser not initialized. Call initialize_browser first.');

        const { seedPhrase, password } = args as any;

        // We need to recreate the MetaMask instance with the password
        if (context && page) {
          metamask = new MetaMask(context, page, password, '');
          await metamask.importWallet(seedPhrase);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Wallet imported successfully',
              }),
            },
          ],
        };
      }

      case 'unlock_wallet': {
        if (!metamask) throw new Error('Browser not initialized.');

        await metamask.unlock();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Wallet unlocked',
              }),
            },
          ],
        };
      }

      case 'lock_wallet': {
        if (!metamask) throw new Error('Browser not initialized.');

        await metamask.lock();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Wallet locked',
              }),
            },
          ],
        };
      }

      case 'add_account': {
        if (!metamask) throw new Error('Browser not initialized.');

        const { accountName } = args as any;
        await metamask.addNewAccount(accountName);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Account "${accountName}" created`,
              }),
            },
          ],
        };
      }

      case 'import_account_from_private_key': {
        if (!metamask) throw new Error('Browser not initialized.');

        const { privateKey } = args as any;
        await metamask.importWalletFromPrivateKey(privateKey);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Account imported from private key`,
              }),
            },
          ],
        };
      }

      case 'switch_account': {
        if (!metamask) throw new Error('Browser not initialized.');

        const { accountNameOrIndex } = args as any;
        await metamask.switchAccount(accountNameOrIndex);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Switched to account: ${accountNameOrIndex}`,
              }),
            },
          ],
        };
      }

      case 'get_account_address': {
        if (!metamask) throw new Error('Browser not initialized.');

        const address = await metamask.getAccountAddress();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                address,
              }),
            },
          ],
        };
      }

      case 'rename_account': {
        if (!metamask) throw new Error('Browser not initialized.');

        const { currentName, newName } = args as any;
        await metamask.renameAccount(currentName, newName);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Account renamed from "${currentName}" to "${newName}"`,
              }),
            },
          ],
        };
      }

      case 'add_network': {
        if (!metamask) throw new Error('Browser not initialized.');

        const network = args as any;
        await metamask.addNetwork(network);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Network "${network.name}" added`,
              }),
            },
          ],
        };
      }

      case 'switch_network': {
        if (!metamask) throw new Error('Browser not initialized.');

        const { network, waitForNewNetwork = true } = args as any;
        await metamask.switchNetwork(network, waitForNewNetwork);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Switched to network: ${network}`,
              }),
            },
          ],
        };
      }

      case 'confirm_transaction': {
        if (!metamask) throw new Error('Browser not initialized.');

        const { gasSetting } = args as any;
        await metamask.confirmTransaction(gasSetting);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Transaction confirmed',
              }),
            },
          ],
        };
      }

      case 'reject_transaction': {
        if (!metamask) throw new Error('Browser not initialized.');

        await metamask.rejectTransaction();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Transaction rejected',
              }),
            },
          ],
        };
      }

      case 'confirm_transaction_and_wait': {
        if (!metamask) throw new Error('Browser not initialized.');

        const { gasSetting } = args as any;
        await metamask.confirmTransactionAndWaitForMining(gasSetting);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Transaction confirmed and mined',
              }),
            },
          ],
        };
      }

      case 'sign_message': {
        if (!metamask) throw new Error('Browser not initialized.');

        await metamask.confirmSignature();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Message signed',
              }),
            },
          ],
        };
      }

      case 'sign_typed_data': {
        if (!metamask) throw new Error('Browser not initialized.');

        await metamask.confirmSignature();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Typed data signed',
              }),
            },
          ],
        };
      }

      case 'reject_signature': {
        if (!metamask) throw new Error('Browser not initialized.');

        await metamask.rejectSignature();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Signature rejected',
              }),
            },
          ],
        };
      }

      case 'approve_token': {
        if (!metamask) throw new Error('Browser not initialized.');

        const { spendLimit, gasSetting } = args as any;
        await metamask.approveTokenPermission({ spendLimit, gasSetting });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Token approval confirmed',
              }),
            },
          ],
        };
      }

      case 'reject_token_approval': {
        if (!metamask) throw new Error('Browser not initialized.');

        await metamask.rejectTokenPermission();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Token approval rejected',
              }),
            },
          ],
        };
      }

      case 'add_token': {
        if (!metamask) throw new Error('Browser not initialized.');

        await metamask.addNewToken();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Token added to wallet',
              }),
            },
          ],
        };
      }

      case 'connect_to_dapp': {
        if (!metamask) throw new Error('Browser not initialized.');

        const { accounts } = args as any;
        await metamask.connectToDapp(accounts);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Connected to dapp',
              }),
            },
          ],
        };
      }

      case 'approve_network_switch': {
        if (!metamask) throw new Error('Browser not initialized.');

        await metamask.approveSwitchNetwork();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Network switch approved',
              }),
            },
          ],
        };
      }

      case 'reject_network_switch': {
        if (!metamask) throw new Error('Browser not initialized.');

        await metamask.rejectSwitchNetwork();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Network switch rejected',
              }),
            },
          ],
        };
      }

      case 'approve_add_network': {
        if (!metamask) throw new Error('Browser not initialized.');

        await metamask.approveNewNetwork();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Add network request approved',
              }),
            },
          ],
        };
      }

      case 'reject_add_network': {
        if (!metamask) throw new Error('Browser not initialized.');

        await metamask.rejectNewNetwork();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Add network request rejected',
              }),
            },
          ],
        };
      }

      case 'navigate_to_url': {
        if (!page) throw new Error('Browser not initialized.');

        const { url, waitUntil = 'load' } = args as any;
        await page.goto(url, { waitUntil });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Navigated to ${url}`,
              }),
            },
          ],
        };
      }

      case 'click_element': {
        if (!page) throw new Error('Browser not initialized.');

        const { selector, timeout = 30000 } = args as any;
        await page.locator(selector).click({ timeout });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Clicked element: ${selector}`,
              }),
            },
          ],
        };
      }

      case 'fill_input': {
        if (!page) throw new Error('Browser not initialized.');

        const { selector, value } = args as any;
        await page.locator(selector).fill(value);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Filled input: ${selector}`,
              }),
            },
          ],
        };
      }

      case 'get_page_content': {
        if (!page) throw new Error('Browser not initialized.');

        const { selector } = args as any;
        const content = await page.locator(selector).textContent();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                content,
              }),
            },
          ],
        };
      }

      case 'reset_account': {
        if (!metamask) throw new Error('Browser not initialized.');

        await metamask.resetAccount();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Account reset',
              }),
            },
          ],
        };
      }

      case 'enable_eth_sign': {
        if (!metamask) throw new Error('Browser not initialized.');

        await metamask.unsafe_enableEthSign();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'eth_sign enabled (UNSAFE)',
              }),
            },
          ],
        };
      }

      case 'provide_encryption_key': {
        if (!metamask) throw new Error('Browser not initialized.');

        await metamask.providePublicEncryptionKey();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Encryption key provided',
              }),
            },
          ],
        };
      }

      case 'decrypt_message': {
        if (!metamask) throw new Error('Browser not initialized.');

        await metamask.decrypt();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Message decrypted',
              }),
            },
          ],
        };
      }

      case 'close_browser': {
        if (context) {
          await context.close();
          context = null;
          page = null;
          metamask = null;
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Browser closed',
              }),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack,
          }),
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Synpress MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
