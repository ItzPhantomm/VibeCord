import pc from 'picocolors';
import { UI } from '../ui.js';
import { ALL_TOOLS, zodToJsonSchema, type ToolCategory } from '../../tools/registry.js';

export interface ToolsOptions {
  category?: string;
  search?: string;
  json?: boolean;
}

export async function toolsCommand(options: ToolsOptions = {}) {
  let tools = [...ALL_TOOLS];

  if (options.category) {
    tools = tools.filter(t => t.category.toLowerCase() === options.category?.toLowerCase());
  }

  if (options.search) {
    const term = options.search.toLowerCase();
    tools = tools.filter(t => t.name.toLowerCase().includes(term) || t.description.toLowerCase().includes(term));
  }

  if (options.json) {
    const serialized = tools.map(t => ({
      name: t.name,
      category: t.category,
      description: t.description,
      isDestructive: t.isDestructive,
      requiredPermissions: t.requiredPermissions,
      parameters: zodToJsonSchema(t.parameters),
    }));
    console.log(JSON.stringify(serialized, null, 2));
    return;
  }

  UI.banner();

  console.log(` ${pc.bold('VibeCord Tool Catalog')}`);
  console.log(` ${pc.dim(`Total available tools: ${tools.length} (out of ${ALL_TOOLS.length})`)}\n`);

  const rows = tools.map(t => {
    const destructiveTag = t.isDestructive
      ? pc.red('✖ Destructive')
      : pc.green('✔ Safe');

    const perms = t.requiredPermissions.length > 0
      ? t.requiredPermissions.map(p => pc.dim(p)).join(', ')
      : pc.dim('None');

    return [
      pc.bold(pc.green(t.name)),
      pc.cyan(t.category),
      destructiveTag,
      perms,
      pc.dim(t.description.length > 55 ? t.description.slice(0, 52) + '...' : t.description),
    ];
  });

  console.log(UI.table(['Tool Name', 'Category', 'Mode', 'Required Permissions', 'Description'], rows));
  console.log();
  console.log(` ${pc.dim('Run any tool directly via CLI: vibecord exec <tool_name> [args...]')}`);
  console.log(` ${pc.dim('Or query full JSON schema with: vibecord tools --json')}\n`);
}
