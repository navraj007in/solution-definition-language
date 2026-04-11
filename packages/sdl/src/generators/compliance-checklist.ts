import type { SDLDocument } from '../types';
import type { RawGeneratorResult } from './types';

/**
 * Generates a per-framework compliance checklist from compliance.frameworks[].
 * Advisory — this is a starting point for compliance work, not a compliance audit.
 *
 * When compliance.frameworks[] is absent, produces a generic checklist skeleton.
 */
export function generateComplianceChecklist(doc: SDLDocument): RawGeneratorResult {
  const frameworks = doc.compliance?.frameworks ?? [];
  const markdown = renderChecklist(doc, frameworks);

  return {
    artifactType: 'compliance-checklist',
    files: [
      {
        path: 'artifacts/compliance/compliance-checklist.md',
        content: markdown,
      },
    ],
    metadata: {
      solutionName: doc.solution.name,
      frameworkCount: frameworks.length,
      frameworks: frameworks.map((f) => f.name),
    },
  };
}

// ─── Framework knowledge base ───

interface FrameworkKnowledge {
  description: string;
  categories: { name: string; items: string[] }[];
}

const FRAMEWORK_KNOWLEDGE: Record<string, FrameworkKnowledge> = {
  GDPR: {
    description: 'EU General Data Protection Regulation — governs personal data of EU residents',
    categories: [
      {
        name: 'Lawful Basis & Consent',
        items: [
          'Identify and document the lawful basis for each data processing activity',
          'Implement explicit consent collection for marketing and analytics',
          'Record consent with version, timestamp, and IP address',
          'Provide clear mechanism to withdraw consent',
        ],
      },
      {
        name: 'Data Subject Rights',
        items: [
          'Implement right of access — users can export all their personal data',
          'Implement right to erasure — hard delete within 30 days of request',
          'Implement right to rectification — users can update their data',
          'Implement data portability — export in machine-readable format (JSON/CSV)',
          'Document and respect right to object to processing',
        ],
      },
      {
        name: 'Privacy by Design',
        items: [
          'Collect only data necessary for the stated purpose (data minimisation)',
          'Encrypt PII at rest (AES-256 or equivalent)',
          'Encrypt all data in transit (TLS 1.2+)',
          'Apply pseudonymisation where possible',
          'Define and enforce data retention periods per data type',
        ],
      },
      {
        name: 'Breach Notification',
        items: [
          'Establish incident response procedure for data breaches',
          'Notify supervisory authority within 72 hours of breach discovery',
          'Notify affected data subjects when breach poses high risk',
          'Maintain breach log with dates, scope, and actions taken',
        ],
      },
      {
        name: 'Vendor & DPA',
        items: [
          'Sign Data Processing Agreements (DPAs) with all sub-processors',
          'Maintain updated record of all sub-processors and their roles',
          'Conduct annual vendor compliance review',
        ],
      },
    ],
  },
  HIPAA: {
    description: 'US Health Insurance Portability and Accountability Act — governs protected health information (PHI)',
    categories: [
      {
        name: 'Administrative Safeguards',
        items: [
          'Appoint a HIPAA Security Officer',
          'Conduct annual risk analysis and document findings',
          'Implement workforce training on HIPAA policies',
          'Establish sanction policy for workforce violations',
          'Implement access management procedures — least privilege principle',
        ],
      },
      {
        name: 'Physical Safeguards',
        items: [
          'Document physical access controls to systems containing PHI',
          'Implement workstation security policies',
          'Establish device and media disposal procedures',
        ],
      },
      {
        name: 'Technical Safeguards',
        items: [
          'Implement unique user identification for all PHI access',
          'Implement automatic logoff for idle sessions',
          'Enable encryption for PHI at rest and in transit',
          'Implement audit controls — log all PHI access and modifications',
          'Implement integrity controls to detect unauthorized PHI alteration',
        ],
      },
      {
        name: 'Business Associate Agreements',
        items: [
          'Execute BAAs with all vendors who access, store, or transmit PHI',
          'Maintain a list of all business associates',
          'Review and update BAAs on vendor contract renewal',
        ],
      },
      {
        name: 'Breach Notification Rule',
        items: [
          'Notify affected individuals within 60 days of breach discovery',
          'Notify HHS within 60 days (immediately if breach affects 500+)',
          'Notify media in affected states if breach affects 500+ residents',
        ],
      },
    ],
  },
  'SOC2-Type2': {
    description: 'AICPA System and Organization Controls 2 — Trust Services Criteria',
    categories: [
      {
        name: 'Security (CC6)',
        items: [
          'Implement multi-factor authentication for all system access',
          'Enforce role-based access control (RBAC)',
          'Conduct quarterly access reviews and remove stale permissions',
          'Implement intrusion detection and monitoring',
          'Perform annual penetration testing',
        ],
      },
      {
        name: 'Availability (A1)',
        items: [
          'Define and document availability SLAs',
          'Implement monitoring and alerting for downtime',
          'Test disaster recovery procedures at least annually',
          'Maintain documented incident response runbooks',
        ],
      },
      {
        name: 'Confidentiality (C1)',
        items: [
          'Classify data by sensitivity level',
          'Encrypt confidential data at rest and in transit',
          'Implement data loss prevention controls',
          'Enforce NDAs for staff and contractors with access to confidential data',
        ],
      },
      {
        name: 'Change Management (CC8)',
        items: [
          'Use version-controlled infrastructure as code',
          'Require code review for all production changes',
          'Maintain change log with approver and rationale',
          'Test changes in staging before production deployment',
        ],
      },
      {
        name: 'Vendor Management (CC9)',
        items: [
          'Conduct annual security review of critical vendors',
          'Require vendors to maintain SOC 2 or equivalent certification',
          'Review vendor incident reports and security advisories',
        ],
      },
    ],
  },
  'PCI-DSS': {
    description: 'Payment Card Industry Data Security Standard — governs cardholder data',
    categories: [
      {
        name: 'Cardholder Data Protection',
        items: [
          'Never store full card numbers, CVV, or magnetic stripe data',
          'Use a PCI-compliant payment processor (Stripe, Braintree, etc.) — do not handle raw card data',
          'Tokenise all card references using the payment processor\'s token',
          'Encrypt any cardholder data that must be stored',
        ],
      },
      {
        name: 'Network Security',
        items: [
          'Install and maintain firewalls to protect cardholder data environment',
          'Do not use vendor-supplied defaults for passwords or security parameters',
          'Encrypt transmission of cardholder data across open networks',
        ],
      },
      {
        name: 'Access Control',
        items: [
          'Restrict access to cardholder data on a need-to-know basis',
          'Assign unique IDs to each person with computer access',
          'Restrict physical access to cardholder data',
        ],
      },
      {
        name: 'Monitoring & Testing',
        items: [
          'Track and monitor all access to cardholder data and network resources',
          'Regularly test security systems and processes',
          'Maintain a policy that addresses information security for employees',
        ],
      },
    ],
  },
};

// Alias mapping for common name variants
const FRAMEWORK_ALIASES: Record<string, string> = {
  'soc2': 'SOC2-Type2',
  'soc2-type2': 'SOC2-Type2',
  'soc2-type1': 'SOC2-Type2',
  'pci-dss': 'PCI-DSS',
  'pci': 'PCI-DSS',
  'gdpr': 'GDPR',
  'hipaa': 'HIPAA',
  'iso27001': 'ISO27001',
  'sox': 'SOX',
};

function resolveFrameworkKey(name: string): string {
  return FRAMEWORK_ALIASES[name.toLowerCase()] ?? name;
}

// ─── Checklist renderer ───

function renderChecklist(
  doc: SDLDocument,
  frameworks: Array<{ name: string; applicable?: boolean; requirements?: Array<{ requirement?: string; implementation?: string }> }>,
): string {
  const lines: string[] = [];
  lines.push(`# Compliance Checklist — ${doc.solution.name}`);
  lines.push('');
  lines.push(`Stage: ${doc.solution.stage}`);
  lines.push('');

  if (frameworks.length === 0) {
    lines.push('> No compliance frameworks declared in SDL. Add a `compliance.frameworks[]` section to generate a framework-specific checklist.');
    lines.push('');
    lines.push('## Generic Security Baseline');
    lines.push('');
    renderBaselineChecklist(lines);
    return lines.join('\n');
  }

  const applicable = frameworks.filter((f) => f.applicable !== false);
  const notApplicable = frameworks.filter((f) => f.applicable === false);

  for (const fw of applicable) {
    const key = resolveFrameworkKey(fw.name);
    const knowledge = FRAMEWORK_KNOWLEDGE[key];

    lines.push(`## ${fw.name}`);
    lines.push('');
    if (knowledge) {
      lines.push(`> ${knowledge.description}`);
      lines.push('');
    }

    // SDL-declared requirements first
    if (fw.requirements && fw.requirements.length > 0) {
      lines.push('### Declared Requirements');
      lines.push('');
      for (const req of fw.requirements) {
        if (req.requirement) {
          lines.push(`- [ ] **${req.requirement}**`);
          if (req.implementation) {
            lines.push(`  - Implementation: ${req.implementation}`);
          }
        }
      }
      lines.push('');
    }

    // Knowledge base categories
    if (knowledge && knowledge.categories.length > 0) {
      for (const cat of knowledge.categories) {
        lines.push(`### ${cat.name}`);
        lines.push('');
        for (const item of cat.items) {
          lines.push(`- [ ] ${item}`);
        }
        lines.push('');
      }
    } else if (!fw.requirements || fw.requirements.length === 0) {
      lines.push(`> No built-in checklist available for ${fw.name}. Add requirements to the SDL compliance section.`);
      lines.push('');
    }
  }

  if (notApplicable.length > 0) {
    lines.push('## Not Applicable');
    lines.push('');
    for (const fw of notApplicable) {
      lines.push(`- **${fw.name}** — marked as not applicable`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderBaselineChecklist(lines: string[]): void {
  const items = [
    'Encrypt all data in transit (TLS 1.2+)',
    'Encrypt sensitive data at rest',
    'Implement authentication and authorisation for all endpoints',
    'Apply principle of least privilege for all service accounts and users',
    'Enable audit logging for all sensitive operations',
    'Define and test a data breach response procedure',
    'Conduct annual security review or penetration test',
    'Review and rotate credentials and API keys quarterly',
    'Maintain an inventory of all third-party data processors',
  ];
  for (const item of items) {
    lines.push(`- [ ] ${item}`);
  }
}
