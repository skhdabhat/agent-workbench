import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

export async function startBuiltinFetchServer(): Promise<void> {
  const server = new McpServer({
    name: 'builtin-fetch',
    version: '1.0.0',
  });

  server.tool(
    'fetch',
    'Fetches a URL from the internet and extracts its contents as markdown.',
    {
      url: z.string().url().describe('URL to fetch'),
      max_length: z.number().optional().describe('Maximum characters to return'),
    },
    async ({ url, max_length = 5000 }) => {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Agent-Workbench/1.0',
          },
        });

        if (!response.ok) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `HTTP ${response.status}: ${response.statusText}`,
              },
            ],
            isError: true,
          };
        }

        const html = await response.text();
        const text = htmlToSimpleMarkdown(html).slice(0, max_length);

        return {
          content: [{ type: 'text' as const, text }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Fetch error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function htmlToSimpleMarkdown(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n## $1\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
