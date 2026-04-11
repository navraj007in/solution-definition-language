/**
 * Parses ADR markdown files (MADR format as produced by generateADRs) into
 * structured constraints that can be injected into AI coding rule files.
 *
 * Only accepted ADRs produce constraints — superseded/deprecated ADRs are skipped.
 */
/**
 * Parse a single ADR markdown string (MADR format).
 * Returns null if the ADR is not accepted or cannot be parsed.
 */
export function parseADR(markdown) {
    const lines = markdown.split('\n');
    let title = '';
    let status = 'unknown';
    let decision = '';
    let consequences = '';
    const rejectedAlternatives = [];
    let currentSection = '';
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Title from H1
        if (line.startsWith('# ') && !title) {
            title = line.replace(/^#\s+/, '').trim();
            continue;
        }
        // Section headings
        if (line.startsWith('## ')) {
            currentSection = line.replace(/^##\s+/, '').toLowerCase();
            continue;
        }
        // Status line — first non-empty line after "## Status"
        if (currentSection === 'status' && line && !status.match(/^(accepted|superseded|deprecated|proposed)$/)) {
            const s = line.toLowerCase();
            if (s.includes('accepted'))
                status = 'accepted';
            else if (s.includes('superseded'))
                status = 'superseded';
            else if (s.includes('deprecated'))
                status = 'deprecated';
            else if (s.includes('proposed'))
                status = 'proposed';
            continue;
        }
        // Decision section — collect all non-empty lines
        if (currentSection === 'decision' && line) {
            decision += (decision ? ' ' : '') + line;
            continue;
        }
        // Consequences section — collect all non-empty lines
        if (currentSection === 'consequences' && line) {
            consequences += (consequences ? ' ' : '') + line;
            continue;
        }
        // Alternatives considered — extract option names from bold/heading lines
        if (currentSection === 'alternatives considered' && line) {
            // Match "**Option Name**" or "### Option Name" or "- **Option**:" patterns
            const boldMatch = line.match(/^\*\*(.+?)\*\*/);
            const headingMatch = line.match(/^###\s+(.+)/);
            const listMatch = line.match(/^[-*]\s+\*\*(.+?)\*\*/);
            const optionMatch = boldMatch || headingMatch || listMatch;
            if (optionMatch) {
                rejectedAlternatives.push(optionMatch[1].replace(/:$/, '').trim());
            }
        }
    }
    if (!title || !decision)
        return null;
    return { id: extractId(title), title, status, decision, consequences, rejectedAlternatives };
}
/**
 * Parse multiple ADR markdown strings and return only accepted ones.
 */
export function parseADRs(markdownFiles) {
    return markdownFiles
        .map(parseADR)
        .filter((adr) => adr !== null && adr.status === 'accepted');
}
/**
 * Convert a list of accepted ADRs into coding rule strings.
 * Each rule includes the decision and a "do not suggest" constraint for rejected alternatives.
 */
export function adrsToCodingRules(adrs) {
    const rules = [];
    for (const adr of adrs) {
        // Core decision rule
        let rule = `${adr.id}: ${truncate(adr.decision, 200)}`;
        // Append key consequence if short enough
        if (adr.consequences && adr.consequences.length < 120) {
            rule += ` — ${adr.consequences}`;
        }
        rules.push(rule);
        // Rejected alternatives → "do not suggest" constraint
        // Skip the chosen option (first one is often the selected one in MADR format)
        if (adr.rejectedAlternatives.length > 1) {
            const rejected = adr.rejectedAlternatives.slice(1, 4); // max 3
            if (rejected.length > 0) {
                rules.push(`${adr.id} (rejected alternatives — do not suggest): ${rejected.join(', ')}`);
            }
        }
    }
    return rules;
}
// ─── Helpers ───
function extractId(title) {
    // Title may be "ADR-003: Database Selection" or "ADR 3: ..."
    const match = title.match(/^(ADR[-\s]\d+)/i);
    if (match)
        return match[1].toUpperCase().replace(/\s/, '-');
    return 'ADR';
}
function truncate(str, max) {
    if (str.length <= max)
        return str;
    return str.slice(0, max - 1) + '…';
}
