#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const API_BASE = "https://api.buywhere.ai/v1";
const API_KEY = process.env.BUYWHERE_API_KEY;

const SearchProductsSchema = z.object({
  query: z.string().describe("Product search keyword"),
  market: z.enum(["sg", "my", "us", "au", "ph", "id"]).optional().describe("Market/region code (sg=Singapore, my=Malaysia, us=USA, au=Australia, ph=Philippines, id=Indonesia)"),
  category: z.string().optional().describe("Product category filter"),
  min_price: z.number().optional().describe("Minimum price filter"),
  max_price: z.number().optional().describe("Maximum price filter"),
  limit: z.number().min(1).max(50).default(10).describe("Number of results to return")
});

const GetProductSchema = z.object({
  product_id: z.string().describe("BuyWhere product ID")
});

const GetPriceSchema = z.object({
  product_id: z.string().describe("BuyWhere product ID")
});

const ComparePricesSchema = z.object({
  product_ids: z.array(z.string()).min(2).max(5).describe("Array of 2–5 BuyWhere product IDs to compare")
});

const GetAffiliateLinkSchema = z.object({
  product_id: z.string().describe("BuyWhere product ID")
});

const GetCatalogSchema = z.object({
  market: z.enum(["sg", "my", "us", "au", "ph", "id"]).optional().describe("Market/region code")
});

const tools = {
  search_products: {
    description: "Search BuyWhere product catalog by keyword, category, price range, and market. Returns product listings from Shopee, Lazada, Amazon, Walmart, and 20+ platforms.",
    inputSchema: zodToJsonSchema(SearchProductsSchema)
  },
  get_product: {
    description: "Get full product details by BuyWhere product ID, including price, specs, images, and merchant info.",
    inputSchema: zodToJsonSchema(GetProductSchema)
  },
  get_price: {
    description: "Get current prices for a product across all merchants.",
    inputSchema: zodToJsonSchema(GetPriceSchema)
  },
  compare_prices: {
    description: "Compare 2–5 products side by side with best-value guidance.",
    inputSchema: zodToJsonSchema(ComparePricesSchema)
  },
  get_affiliate_link: {
    description: "Get a click-tracked affiliate URL for a product.",
    inputSchema: zodToJsonSchema(GetAffiliateLinkSchema)
  },
  get_catalog: {
    description: "Browse the BuyWhere category taxonomy for a market.",
    inputSchema: zodToJsonSchema(GetCatalogSchema)
  }
};

const server = new Server(
  { name: "@mcp-get-community/server-buywhere", version: "0.1.0", author: "BuyWhere" },
  { capabilities: { tools } }
);

function headers() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) h["Authorization"] = `Bearer ${API_KEY}`;
  return h;
}

async function apiGet(path: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`BuyWhere API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function apiPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`BuyWhere API error ${res.status}: ${await res.text()}`);
  return res.json();
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: Object.entries(tools).map(([name, def]) => ({ name, ...def }))
}));

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params;
  try {
    let result: unknown;
    switch (name) {
      case "search_products": {
        const params = SearchProductsSchema.parse(args);
        const qs = new URLSearchParams({ q: params.query, limit: String(params.limit) });
        if (params.market) qs.set("market", params.market);
        if (params.category) qs.set("category", params.category);
        if (params.min_price !== undefined) qs.set("min_price", String(params.min_price));
        if (params.max_price !== undefined) qs.set("max_price", String(params.max_price));
        result = await apiGet(`/search?${qs}`);
        break;
      }
      case "get_product": {
        const { product_id } = GetProductSchema.parse(args);
        result = await apiGet(`/products/${product_id}`);
        break;
      }
      case "get_price": {
        const { product_id } = GetPriceSchema.parse(args);
        result = await apiGet(`/products/${product_id}/prices`);
        break;
      }
      case "compare_prices": {
        const { product_ids } = ComparePricesSchema.parse(args);
        result = await apiPost("/compare", { product_ids });
        break;
      }
      case "get_affiliate_link": {
        const { product_id } = GetAffiliateLinkSchema.parse(args);
        result = await apiGet(`/products/${product_id}/affiliate`);
        break;
      }
      case "get_catalog": {
        const params = GetCatalogSchema.parse(args);
        const qs = params.market ? `?market=${params.market}` : "";
        result = await apiGet(`/catalog${qs}`);
        break;
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
      isError: true
    };
  }
});

async function main() {
  if (!API_KEY) {
    process.stderr.write("Warning: BUYWHERE_API_KEY not set. Set it to enable authenticated requests.\n");
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
