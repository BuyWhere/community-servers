# BuyWhere MCP Server

A Model Context Protocol (MCP) server for [BuyWhere](https://buywhere.ai) — search and compare 11M+ products across Singapore, SEA, and US markets via AI agents.

## Features

- **Product search** across Shopee, Lazada, Amazon, Walmart, FairPrice, Carousell, and 20+ platforms
- **Price comparison** for 2–5 products side by side
- **Real-time pricing** across merchants
- **Affiliate links** for tracked product URLs
- **Category taxonomy** for structured browsing
- Markets: Singapore (sg), Malaysia (my), USA (us), Australia (au), Philippines (ph), Indonesia (id)

## Installation

```bash
npx @michaellatman/mcp-get@latest install @mcp-get-community/server-buywhere
```

## Configuration

Set your BuyWhere API key as an environment variable. Get a free key at [buywhere.ai/api-keys](https://buywhere.ai/api-keys).

```json
{
  "mcpServers": {
    "buywhere": {
      "command": "npx",
      "args": ["-y", "@mcp-get-community/server-buywhere"],
      "env": {
        "BUYWHERE_API_KEY": "bw_live_xxxx"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `search_products` | Search by keyword, category, price range, and market |
| `get_product` | Full product details by BuyWhere product ID |
| `get_price` | Current prices across merchants |
| `compare_prices` | Side-by-side comparison of 2–5 products |
| `get_affiliate_link` | Click-tracked outbound link for a product |
| `get_catalog` | Browse category taxonomy |

## Development

```bash
npm install
npm run build
npm start
```

## License

MIT — see [LICENSE](LICENSE)
