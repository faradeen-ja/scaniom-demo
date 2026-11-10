export const SCANIOM_CLI_CONTRACT_RELEASE = "R18" as const;
export const SCANIOM_CLI_CONTRACT_VERSION = "0.4.2" as const;

const rules: RegExp[] = [
  /^scaniom version(?:\s|$)/,
  /^scaniom artifacts(?:\s|$)/,
  /^scaniom profile\s+(?:list|add|use|show|test|remove)(?:\s|$)/,
  /^scaniom login(?:\s|$)/,
  /^scaniom auth\s+status(?:\s|$)/,
  /^scaniom whoami(?:\s|$)/,
  /^scaniom logout(?:\s|$)/,
  /^scaniom open(?:\s|$)/,
  /^scaniom env\s+(?:list|create)(?:\s|$)/,
  /^scaniom workload\s+(?:list|use|show|current|clear|create)(?:\s|$)/,
  /^scaniom address\s+(?:list|issue)(?:\s|$)/,
  /^scaniom node\s+(?:list|enroll|cancel|re-enroll|identity|stop|health|doctor|start|restart)(?:\s|$)/,
  /^scaniom provider\s+(?:catalog|list|add|probe)(?:\s|$)/,
  /^scaniom providers(?:\s|$)/,
  /^scaniom connect\s+(?:list|provider)(?:\s|$)/,
  /^scaniom secret\s+configure(?:\s|$)/,
  /^scaniom runtime\s+(?:status|continuity)(?:\s|$)/,
  /^scaniom runtime\s+identity\s+(?:status|bootstrap|rotate|revoke|restore)(?:\s|$)/,
  /^scaniom runtime\s+identity\s+native\s+(?:status|trust|bind)(?:\s|$)/,
  /^scaniom configure\s+(?:show|bootstrap|runtime|immunex)(?:\s|$)/,
  /^scaniom attach\s+(?:status|architecture|l1|l2|l3|l4|l5|mcp|l6)(?:\s|$)/,
  /^scaniom attach\s+test\s+(?:l1|l2|l3|l4|l5|mcp|l6)(?:\s|$)/,
  /^scaniom fabric(?:\s*$|\s+--env\b|\s+(?:add\s+(?:nodes|workload)|pool\s+(?:create|members)|pools\b|workload\s+pools\b|routing\s+preview\b|deployment\b|policy\b|configure\s+workload\b|route\b|plan\b|apply\b|cancel\s+enrollment\b))/,
  /^scaniom fleet(?:\s|$)/,
  /^scaniom live(?:\s|$)/,
  /^scaniom top(?:\s|$)/,
  /^scaniom explain(?:\s|$)/,
  /^scaniom trajectory\s+(?:list|show)(?:\s|$)/,
  /^scaniom proof(?:\s*$|\s+--|\s+correlated\s+(?:list|show|verify)(?:\s|$))/,
  /^scaniom verify(?:\s|$)/,
  /^scaniom policy(?:\s*$|\s+list(?:\s|$)|\s+set(?:\s|$))/,
  /^scaniom authority(?:\s|$)/,
  /^scaniom immunex\s+(?:library|templates|preflight|run|stream|compare|use|open|matrix|scale)(?:\s|$)/,
  /^scaniom immunex\s+blueprint\s+(?:list|create|show)(?:\s|$)/,
  /^scaniom demo(?:\s|$)/,
  /^scaniom ask(?:\s|$)/,
  /^scaniom scenario(?:\s|$)/,
  /^scaniom status(?:\s|$)/,
  /^scaniom setup(?:\s|$)/,
  /^scaniom next(?:\s|$)/,
  /^scaniom guide(?:\s|$)/,
  /^scaniom doctor(?:\s|$)/,
  /^scaniom docs(?:\s|$)/,
  /^scaniom immune(?:\s|$)/,
  /^scaniom deploy\s+(?:inspect|env|compose|k8s)(?:\s|$)/,
  /^scaniom cli\s+install(?:\s|$)/,
];

function stripLeadingEnvironment(command: string): string {
  let value = command.trim();
  while (/^[A-Z_][A-Z0-9_]*=\S+\s+/.test(value)) value = value.replace(/^[A-Z_][A-Z0-9_]*=\S+\s+/, "");
  return value;
}

export function isReleasedScaniomCliCommand(command: string): boolean {
  const value = stripLeadingEnvironment(command);
  return rules.some((rule) => rule.test(value));
}

export function releasedScaniomCliCommand(command: string): string | null {
  return isReleasedScaniomCliCommand(command) ? command : null;
}
