/**
 * Generates a data model (ERD + ORM schema) from an SDL document.
 * Deterministic — same input always produces identical output.
 *
 * Entity source (in priority order):
 *   1. domain.entities[] — used when present; authoritative
 *   2. Inference from personas, core flows, and auth — used when domain is absent
 */
export function generateDataModel(doc) {
    const entities = resolveEntities(doc);
    const relations = inferRelations(entities, doc);
    const erd = renderERD(entities, relations);
    const files = [
        {
            path: 'artifacts/data/erd.mmd',
            content: erd,
        },
    ];
    // Generate ORM schema if a backend project has an ORM set
    const backends = doc.architecture.projects.backend || [];
    const ormBackend = backends.find((be) => be.orm);
    if (ormBackend?.orm) {
        const schema = renderOrmSchema(ormBackend.orm, entities, relations, doc);
        if (schema) {
            files.push({
                path: `artifacts/data/${ormSchemaFilename(ormBackend.orm)}`,
                content: schema,
            });
        }
    }
    return {
        artifactType: 'data-model',
        files,
        metadata: {
            solutionName: doc.solution.name,
            entityCount: entities.length,
            relationCount: relations.length,
            entities: entities.map((e) => e.name),
            primaryDatabase: doc.data.primaryDatabase.type,
            orm: ormBackend?.orm || null,
        },
    };
}
// ─── Entity Resolution ───
/**
 * Returns entities from domain.entities[] when present (authoritative),
 * otherwise falls back to inference from product personas and core flows.
 */
function resolveEntities(doc) {
    if (doc.domain?.entities && doc.domain.entities.length > 0) {
        return entitiesFromDomain(doc);
    }
    return inferEntities(doc);
}
/**
 * Converts domain.entities[] SDL declarations into the internal Entity type.
 * Always prepends a User entity when auth is present and no User entity is declared.
 */
function entitiesFromDomain(doc) {
    const entities = [];
    const seen = new Set();
    // User entity from auth (if not declared in domain)
    const hasDomainUser = doc.domain.entities.some((e) => e.name.toLowerCase() === 'user');
    if (!hasDomainUser && doc.auth && doc.auth.strategy !== 'none') {
        const userFields = [
            { name: 'id', type: 'uuid', pk: true, required: true },
            { name: 'email', type: 'varchar', required: true, unique: true },
            { name: 'name', type: 'varchar', required: true },
        ];
        if (doc.auth.roles && doc.auth.roles.length > 0) {
            userFields.push({ name: 'role', type: 'varchar', required: true, comment: doc.auth.roles.join(', ') });
        }
        userFields.push({ name: 'created_at', type: 'timestamp', required: true }, { name: 'updated_at', type: 'timestamp', required: true });
        entities.push({ name: 'User', fields: userFields });
        seen.add('user');
    }
    for (const domainEntity of doc.domain.entities) {
        if (seen.has(domainEntity.name.toLowerCase()))
            continue;
        seen.add(domainEntity.name.toLowerCase());
        const fields = [];
        for (const f of domainEntity.fields ?? []) {
            fields.push({
                name: toSnakeCase(f.name),
                type: sdlFieldTypeToDbType(f.type),
                pk: f.primaryKey === true,
                required: f.required !== false && f.nullable !== true,
                unique: f.unique === true,
                comment: f.description,
            });
        }
        // Ensure every entity has at least an id field
        if (!fields.some((f) => f.pk)) {
            fields.unshift({ name: 'id', type: 'uuid', pk: true, required: true });
        }
        entities.push({ name: domainEntity.name, fields });
    }
    return entities;
}
/** Map SDL field type strings to canonical DB type strings */
function sdlFieldTypeToDbType(sdlType) {
    const map = {
        uuid: 'uuid',
        string: 'varchar',
        varchar: 'varchar',
        text: 'text',
        int: 'integer',
        integer: 'integer',
        bigint: 'bigint',
        float: 'float',
        decimal: 'decimal',
        boolean: 'boolean',
        bool: 'boolean',
        date: 'date',
        datetime: 'timestamp',
        timestamp: 'timestamp',
        json: 'jsonb',
        jsonb: 'jsonb',
        enum: 'varchar',
    };
    return map[sdlType.toLowerCase()] ?? sdlType;
}
// ─── Entity Inference ───
function inferEntities(doc) {
    const entities = [];
    const seen = new Set();
    // User entity (if auth exists)
    if (doc.auth && doc.auth.strategy !== 'none') {
        const userFields = [
            { name: 'id', type: 'uuid', pk: true, required: true },
            { name: 'email', type: 'varchar', required: true, unique: true },
            { name: 'name', type: 'varchar', required: true },
        ];
        if (doc.auth.roles && doc.auth.roles.length > 0) {
            userFields.push({ name: 'role', type: 'varchar', required: true, comment: doc.auth.roles.join(', ') });
        }
        userFields.push({ name: 'created_at', type: 'timestamp', required: true }, { name: 'updated_at', type: 'timestamp', required: true });
        entities.push({ name: 'User', fields: userFields });
        seen.add('user');
    }
    // Entities from persona goals
    for (const persona of doc.product.personas) {
        for (const goal of persona.goals) {
            const name = extractEntityName(goal);
            if (name && !seen.has(name.toLowerCase())) {
                seen.add(name.toLowerCase());
                entities.push(buildDomainEntity(name));
            }
        }
    }
    // Entities from core flows
    if (doc.product.coreFlows) {
        for (const flow of doc.product.coreFlows) {
            const name = extractEntityFromFlow(flow.name);
            if (name && !seen.has(name.toLowerCase())) {
                seen.add(name.toLowerCase());
                entities.push(buildDomainEntity(name));
            }
        }
    }
    return entities;
}
function extractEntityName(goal) {
    const patterns = [
        /^(?:create|add|manage|view|edit|update|delete|remove|list|browse|search|submit|assign|track)\s+(.+)$/i,
        /^(?:mark|set|toggle)\s+(.+?)(?:\s+(?:as|to|complete|done|active|inactive).*)?$/i,
    ];
    for (const pattern of patterns) {
        const match = goal.match(pattern);
        if (match) {
            return singularize(capitalize(match[1].trim()));
        }
    }
    return null;
}
function extractEntityFromFlow(flowName) {
    const parts = flowName.split(/[\s_-]+/);
    if (parts.length >= 1) {
        const candidate = capitalize(parts[0]);
        const nonEntities = new Set(['login', 'logout', 'signup', 'register', 'search', 'browse', 'view', 'edit', 'check', 'reset']);
        if (!nonEntities.has(candidate.toLowerCase())) {
            return singularize(candidate);
        }
        if (parts.length >= 2) {
            return singularize(capitalize(parts[1]));
        }
    }
    return null;
}
function buildDomainEntity(name) {
    return {
        name,
        fields: [
            { name: 'id', type: 'uuid', pk: true, required: true },
            { name: 'title', type: 'varchar', required: true },
            { name: 'description', type: 'text', required: false },
            { name: 'status', type: 'varchar', required: true },
            { name: 'created_at', type: 'timestamp', required: true },
            { name: 'updated_at', type: 'timestamp', required: true },
        ],
    };
}
// ─── Relation Inference ───
function inferRelations(entities, doc) {
    const relations = [];
    const hasUser = entities.some((e) => e.name === 'User');
    const domainEntities = entities.filter((e) => e.name !== 'User');
    // Every domain entity belongs to a User (if auth exists)
    if (hasUser) {
        for (const entity of domainEntities) {
            // Add userId field to the entity
            if (!entity.fields.some((f) => f.name === 'user_id')) {
                entity.fields.splice(entity.fields.length - 2, 0, {
                    name: 'user_id',
                    type: 'uuid',
                    required: true,
                    comment: 'FK → User',
                });
            }
            relations.push({
                from: 'User',
                to: entity.name,
                type: 'one-to-many',
                label: 'owns',
            });
        }
    }
    return relations;
}
// ─── ERD Renderer ───
function renderERD(entities, relations) {
    const lines = [];
    lines.push('erDiagram');
    // Relations
    for (const rel of relations) {
        const cardinality = rel.type === 'one-to-many'
            ? '||--o{'
            : rel.type === 'many-to-many'
                ? '}o--o{'
                : '||--||';
        lines.push(`    ${rel.from} ${cardinality} ${rel.to} : "${rel.label}"`);
    }
    // Entities
    for (const entity of entities) {
        lines.push(`    ${entity.name} {`);
        for (const field of entity.fields) {
            const constraint = field.pk ? 'PK' : field.unique ? 'UK' : field.comment?.startsWith('FK') ? 'FK' : '';
            lines.push(`        ${field.type} ${field.name}${constraint ? ' ' + constraint : ''}`);
        }
        lines.push('    }');
    }
    return lines.join('\n');
}
// ─── ORM Schema Renderers ───
function renderOrmSchema(orm, entities, relations, doc) {
    switch (orm) {
        case 'prisma':
            return renderPrismaSchema(entities, relations, doc);
        case 'typeorm':
            return renderTypeOrmSchema(entities, relations);
        case 'sequelize':
            return renderSequelizeSchema(entities, relations);
        case 'mongoose':
            return renderMongooseSchema(entities, relations);
        case 'sqlalchemy':
            return renderSqlAlchemySchema(entities, relations);
        case 'ef-core':
            return renderEfCoreSchema(entities, relations);
        case 'gorm':
            return renderGormSchema(entities, relations);
        default:
            return null;
    }
}
function renderPrismaSchema(entities, relations, doc) {
    const dbProvider = doc.data.primaryDatabase.type === 'postgres' ? 'postgresql'
        : doc.data.primaryDatabase.type === 'mysql' ? 'mysql'
            : doc.data.primaryDatabase.type === 'mongodb' ? 'mongodb'
                : doc.data.primaryDatabase.type === 'sqlserver' ? 'sqlserver'
                    : 'postgresql';
    const lines = [];
    lines.push('// Generated from SDL');
    lines.push('generator client {');
    lines.push('  provider = "prisma-client-js"');
    lines.push('}');
    lines.push('');
    lines.push('datasource db {');
    lines.push(`  provider = "${dbProvider}"`);
    lines.push('  url      = env("DATABASE_URL")');
    lines.push('}');
    lines.push('');
    for (const entity of entities) {
        lines.push(`model ${entity.name} {`);
        for (const field of entity.fields) {
            const prismaType = toPrismaType(field.type);
            const modifiers = [];
            if (field.pk)
                modifiers.push('@id @default(uuid())');
            if (field.unique)
                modifiers.push('@unique');
            if (field.name === 'created_at')
                modifiers.push('@default(now()) @map("created_at")');
            if (field.name === 'updated_at')
                modifiers.push('@updatedAt @map("updated_at")');
            if (field.comment?.startsWith('FK'))
                continue; // FK field handled by relation
            const optional = !field.required && !field.pk ? '?' : '';
            const prismaName = toCamelCase(field.name);
            lines.push(`  ${prismaName.padEnd(12)} ${prismaType}${optional}${modifiers.length > 0 ? ' ' + modifiers.join(' ') : ''}`);
        }
        // Relations
        const outgoing = relations.filter((r) => r.from === entity.name);
        const incoming = relations.filter((r) => r.to === entity.name);
        for (const rel of outgoing) {
            if (rel.type === 'one-to-many') {
                lines.push(`  ${pluralizeLower(rel.to).padEnd(12)} ${rel.to}[]`);
            }
        }
        for (const rel of incoming) {
            if (rel.type === 'one-to-many') {
                const fieldName = rel.from.charAt(0).toLowerCase() + rel.from.slice(1);
                lines.push(`  ${fieldName.padEnd(12)} ${rel.from} @relation(fields: [${fieldName}Id], references: [id])`);
                lines.push(`  ${(fieldName + 'Id').padEnd(12)} String`);
            }
        }
        lines.push('}');
        lines.push('');
    }
    return lines.join('\n');
}
function renderTypeOrmSchema(entities, relations) {
    const lines = [];
    lines.push('// Generated from SDL');
    lines.push("import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';");
    lines.push('');
    for (const entity of entities) {
        lines.push('@Entity()');
        lines.push(`export class ${entity.name} {`);
        for (const field of entity.fields) {
            if (field.pk) {
                lines.push("  @PrimaryGeneratedColumn('uuid')");
                lines.push(`  ${toCamelCase(field.name)}: string;`);
            }
            else if (field.name === 'created_at') {
                lines.push('  @CreateDateColumn()');
                lines.push('  createdAt: Date;');
            }
            else if (field.name === 'updated_at') {
                lines.push('  @UpdateDateColumn()');
                lines.push('  updatedAt: Date;');
            }
            else if (field.comment?.startsWith('FK')) {
                continue;
            }
            else {
                const decorator = field.unique ? '@Column({ unique: true })' : `@Column(${!field.required ? '{ nullable: true }' : ''})`;
                lines.push(`  ${decorator}`);
                lines.push(`  ${toCamelCase(field.name)}: ${toTsType(field.type)};`);
            }
            lines.push('');
        }
        // Relations
        const outgoing = relations.filter((r) => r.from === entity.name);
        const incoming = relations.filter((r) => r.to === entity.name);
        for (const rel of outgoing) {
            if (rel.type === 'one-to-many') {
                lines.push(`  @OneToMany(() => ${rel.to}, (${rel.to.toLowerCase()}) => ${rel.to.toLowerCase()}.${entity.name.toLowerCase()})`);
                lines.push(`  ${pluralizeLower(rel.to)}: ${rel.to}[];`);
                lines.push('');
            }
        }
        for (const rel of incoming) {
            if (rel.type === 'one-to-many') {
                const fieldName = rel.from.charAt(0).toLowerCase() + rel.from.slice(1);
                lines.push(`  @ManyToOne(() => ${rel.from}, (${fieldName}) => ${fieldName}.${pluralizeLower(entity.name)})`);
                lines.push(`  ${fieldName}: ${rel.from};`);
                lines.push('');
            }
        }
        lines.push('}');
        lines.push('');
    }
    return lines.join('\n');
}
function renderSequelizeSchema(entities, relations) {
    const lines = [];
    lines.push('// Generated from SDL');
    lines.push("import { Model, DataTypes, Sequelize } from 'sequelize';");
    lines.push('');
    lines.push('export function defineModels(sequelize: Sequelize) {');
    for (const entity of entities) {
        const modelVar = entity.name.charAt(0).toLowerCase() + entity.name.slice(1);
        lines.push(`  const ${entity.name} = sequelize.define('${entity.name}', {`);
        for (const field of entity.fields) {
            if (field.pk) {
                lines.push(`    ${toCamelCase(field.name)}: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },`);
            }
            else if (field.name === 'created_at' || field.name === 'updated_at') {
                continue; // Handled by timestamps: true
            }
            else if (field.comment?.startsWith('FK')) {
                continue;
            }
            else {
                const seqType = toSequelizeType(field.type);
                const opts = [`type: ${seqType}`];
                if (!field.required)
                    opts.push('allowNull: true');
                if (field.unique)
                    opts.push('unique: true');
                lines.push(`    ${toCamelCase(field.name)}: { ${opts.join(', ')} },`);
            }
        }
        lines.push('  }, { timestamps: true });');
        lines.push('');
    }
    // Associations
    for (const rel of relations) {
        if (rel.type === 'one-to-many') {
            lines.push(`  ${rel.from}.hasMany(${rel.to});`);
            lines.push(`  ${rel.to}.belongsTo(${rel.from});`);
        }
    }
    lines.push('');
    lines.push(`  return { ${entities.map((e) => e.name).join(', ')} };`);
    lines.push('}');
    return lines.join('\n');
}
function renderMongooseSchema(entities, relations) {
    const lines = [];
    lines.push('// Generated from SDL');
    lines.push("import mongoose, { Schema, Document } from 'mongoose';");
    lines.push('');
    for (const entity of entities) {
        const iface = `I${entity.name}`;
        lines.push(`export interface ${iface} extends Document {`);
        for (const field of entity.fields) {
            if (field.pk)
                continue; // Mongoose uses _id
            if (field.name === 'created_at' || field.name === 'updated_at')
                continue;
            const tsType = field.comment?.startsWith('FK') ? 'mongoose.Types.ObjectId' : toTsType(field.type);
            const optional = !field.required ? '?' : '';
            lines.push(`  ${toCamelCase(field.name)}${optional}: ${tsType};`);
        }
        lines.push('}');
        lines.push('');
        lines.push(`const ${entity.name}Schema = new Schema<${iface}>({`);
        for (const field of entity.fields) {
            if (field.pk)
                continue;
            if (field.name === 'created_at' || field.name === 'updated_at')
                continue;
            if (field.comment?.startsWith('FK')) {
                const ref = relations.find((r) => r.to === entity.name)?.from || 'Unknown';
                lines.push(`  ${toCamelCase(field.name)}: { type: Schema.Types.ObjectId, ref: '${ref}'${field.required ? ', required: true' : ''} },`);
            }
            else {
                const mongoType = toMongooseType(field.type);
                const opts = [`type: ${mongoType}`];
                if (field.required)
                    opts.push('required: true');
                if (field.unique)
                    opts.push('unique: true');
                lines.push(`  ${toCamelCase(field.name)}: { ${opts.join(', ')} },`);
            }
        }
        lines.push('}, { timestamps: true });');
        lines.push('');
        lines.push(`export const ${entity.name} = mongoose.model<${iface}>('${entity.name}', ${entity.name}Schema);`);
        lines.push('');
    }
    return lines.join('\n');
}
function renderSqlAlchemySchema(entities, relations) {
    const lines = [];
    lines.push('# Generated from SDL');
    lines.push('from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Integer, Float');
    lines.push('from sqlalchemy.dialects.postgresql import UUID');
    lines.push('from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship');
    lines.push('from datetime import datetime');
    lines.push('import uuid');
    lines.push('');
    lines.push('');
    lines.push('class Base(DeclarativeBase):');
    lines.push('    pass');
    lines.push('');
    for (const entity of entities) {
        const tableName = toSnakeCase(entity.name) + 's';
        lines.push('');
        lines.push(`class ${entity.name}(Base):`);
        lines.push(`    __tablename__ = "${tableName}"`);
        lines.push('');
        for (const field of entity.fields) {
            if (field.comment?.startsWith('FK')) {
                const ref = relations.find((r) => r.to === entity.name)?.from;
                if (ref) {
                    const refTable = toSnakeCase(ref) + 's';
                    lines.push(`    ${field.name}: Mapped[str] = mapped_column(ForeignKey("${refTable}.id"))`);
                }
                continue;
            }
            const saType = toSqlAlchemyType(field.type);
            const opts = [];
            if (field.pk)
                opts.push('primary_key=True', 'default=uuid.uuid4');
            if (field.unique)
                opts.push('unique=True');
            if (!field.required && !field.pk)
                opts.push('nullable=True');
            if (field.name === 'created_at')
                opts.push('default=datetime.utcnow');
            if (field.name === 'updated_at')
                opts.push('default=datetime.utcnow', 'onupdate=datetime.utcnow');
            const pyType = toPythonType(field.type);
            lines.push(`    ${field.name}: Mapped[${pyType}] = mapped_column(${saType}${opts.length > 0 ? ', ' + opts.join(', ') : ''})`);
        }
        // Relationships
        const outgoing = relations.filter((r) => r.from === entity.name);
        const incoming = relations.filter((r) => r.to === entity.name);
        for (const rel of outgoing) {
            if (rel.type === 'one-to-many') {
                lines.push(`    ${toSnakeCase(rel.to)}s: Mapped[list["${rel.to}"]] = relationship(back_populates="${toSnakeCase(entity.name)}")`);
            }
        }
        for (const rel of incoming) {
            if (rel.type === 'one-to-many') {
                lines.push(`    ${toSnakeCase(rel.from)}: Mapped["${rel.from}"] = relationship(back_populates="${toSnakeCase(entity.name)}s")`);
            }
        }
    }
    lines.push('');
    return lines.join('\n');
}
function renderEfCoreSchema(entities, relations) {
    const lines = [];
    lines.push('// Generated from SDL');
    lines.push('using System.ComponentModel.DataAnnotations;');
    lines.push('using System.ComponentModel.DataAnnotations.Schema;');
    lines.push('using Microsoft.EntityFrameworkCore;');
    lines.push('');
    for (const entity of entities) {
        lines.push(`public class ${entity.name}`);
        lines.push('{');
        for (const field of entity.fields) {
            if (field.comment?.startsWith('FK'))
                continue;
            const csType = toCSharpType(field.type);
            const nullable = !field.required && !field.pk ? '?' : '';
            if (field.pk)
                lines.push('    [Key]');
            if (field.unique)
                lines.push(`    [MaxLength(256)]`);
            lines.push(`    public ${csType}${nullable} ${toPascalCase(field.name)} { get; set; }`);
        }
        // Navigation properties
        const outgoing = relations.filter((r) => r.from === entity.name);
        const incoming = relations.filter((r) => r.to === entity.name);
        for (const rel of outgoing) {
            if (rel.type === 'one-to-many') {
                lines.push(`    public ICollection<${rel.to}> ${rel.to}s { get; set; } = new List<${rel.to}>();`);
            }
        }
        for (const rel of incoming) {
            if (rel.type === 'one-to-many') {
                lines.push(`    public Guid ${rel.from}Id { get; set; }`);
                lines.push(`    [ForeignKey("${rel.from}Id")]`);
                lines.push(`    public ${rel.from} ${rel.from} { get; set; } = null!;`);
            }
        }
        lines.push('}');
        lines.push('');
    }
    // DbContext
    lines.push('public class AppDbContext : DbContext');
    lines.push('{');
    lines.push('    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }');
    lines.push('');
    for (const entity of entities) {
        lines.push(`    public DbSet<${entity.name}> ${entity.name}s { get; set; }`);
    }
    lines.push('}');
    lines.push('');
    return lines.join('\n');
}
function renderGormSchema(entities, relations) {
    const lines = [];
    lines.push('// Generated from SDL');
    lines.push('package models');
    lines.push('');
    lines.push('import (');
    lines.push('\t"time"');
    lines.push('');
    lines.push('\t"github.com/google/uuid"');
    lines.push('\t"gorm.io/gorm"');
    lines.push(')');
    lines.push('');
    for (const entity of entities) {
        lines.push(`type ${entity.name} struct {`);
        for (const field of entity.fields) {
            if (field.pk) {
                lines.push(`\tID        uuid.UUID \`gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"\``);
            }
            else if (field.name === 'created_at') {
                lines.push(`\tCreatedAt time.Time \`json:"createdAt"\``);
            }
            else if (field.name === 'updated_at') {
                lines.push(`\tUpdatedAt time.Time \`json:"updatedAt"\``);
            }
            else if (field.comment?.startsWith('FK')) {
                const ref = relations.find((r) => r.to === entity.name)?.from;
                if (ref) {
                    lines.push(`\t${ref}ID    uuid.UUID \`gorm:"type:uuid;not null" json:"${toCamelCase(field.name)}"\``);
                }
            }
            else {
                const goType = toGoType(field.type);
                const goName = toPascalCase(field.name);
                const tags = [];
                if (!field.required)
                    tags.push('default:null');
                if (field.unique)
                    tags.push('uniqueIndex');
                if (field.required)
                    tags.push('not null');
                const gormTag = tags.length > 0 ? ` \`gorm:"${tags.join(';')}" json:"${toCamelCase(field.name)}"\`` : ` \`json:"${toCamelCase(field.name)}"\``;
                lines.push(`\t${goName.padEnd(10)} ${goType}${gormTag}`);
            }
        }
        // Navigation
        const outgoing = relations.filter((r) => r.from === entity.name);
        const incoming = relations.filter((r) => r.to === entity.name);
        for (const rel of outgoing) {
            if (rel.type === 'one-to-many') {
                lines.push(`\t${rel.to}s []${rel.to} \`json:"${toCamelCase(rel.to)}s,omitempty"\``);
            }
        }
        for (const rel of incoming) {
            if (rel.type === 'one-to-many') {
                lines.push(`\t${rel.from} ${rel.from} \`json:"-"\``);
            }
        }
        lines.push('}');
        lines.push('');
    }
    return lines.join('\n');
}
// ─── Helpers ───
function toMongooseType(type) {
    const map = {
        uuid: 'String',
        varchar: 'String',
        text: 'String',
        timestamp: 'Date',
        integer: 'Number',
        boolean: 'Boolean',
        json: 'Schema.Types.Mixed',
        float: 'Number',
    };
    return map[type] || 'String';
}
function toSqlAlchemyType(type) {
    const map = {
        uuid: 'UUID(as_uuid=True)',
        varchar: 'String(256)',
        text: 'Text',
        timestamp: 'DateTime',
        integer: 'Integer',
        boolean: 'Boolean',
        json: 'Text',
        float: 'Float',
    };
    return map[type] || 'String(256)';
}
function toPythonType(type) {
    const map = {
        uuid: 'uuid.UUID',
        varchar: 'str',
        text: 'str',
        timestamp: 'datetime',
        integer: 'int',
        boolean: 'bool',
        json: 'str',
        float: 'float',
    };
    return map[type] || 'str';
}
function toCSharpType(type) {
    const map = {
        uuid: 'Guid',
        varchar: 'string',
        text: 'string',
        timestamp: 'DateTime',
        integer: 'int',
        boolean: 'bool',
        json: 'string',
        float: 'double',
    };
    return map[type] || 'string';
}
function toGoType(type) {
    const map = {
        uuid: 'uuid.UUID',
        varchar: 'string',
        text: 'string',
        timestamp: 'time.Time',
        integer: 'int',
        boolean: 'bool',
        json: 'string',
        float: 'float64',
    };
    return map[type] || 'string';
}
function toSnakeCase(s) {
    return s.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}
function toPascalCase(s) {
    return s.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}
function ormSchemaFilename(orm) {
    switch (orm) {
        case 'prisma': return 'schema.prisma';
        case 'typeorm': return 'entities.ts';
        case 'sequelize': return 'models.ts';
        case 'mongoose': return 'schemas.ts';
        case 'sqlalchemy': return 'models.py';
        case 'ef-core': return 'Models.cs';
        case 'gorm': return 'models.go';
        default: return 'schema.txt';
    }
}
function toPrismaType(type) {
    const map = {
        uuid: 'String',
        varchar: 'String',
        text: 'String',
        timestamp: 'DateTime',
        integer: 'Int',
        boolean: 'Boolean',
        json: 'Json',
        float: 'Float',
    };
    return map[type] || 'String';
}
function toTsType(type) {
    const map = {
        uuid: 'string',
        varchar: 'string',
        text: 'string',
        timestamp: 'Date',
        integer: 'number',
        boolean: 'boolean',
        json: 'Record<string, any>',
        float: 'number',
    };
    return map[type] || 'string';
}
function toSequelizeType(type) {
    const map = {
        uuid: 'DataTypes.UUID',
        varchar: 'DataTypes.STRING',
        text: 'DataTypes.TEXT',
        timestamp: 'DataTypes.DATE',
        integer: 'DataTypes.INTEGER',
        boolean: 'DataTypes.BOOLEAN',
        json: 'DataTypes.JSONB',
        float: 'DataTypes.FLOAT',
    };
    return map[type] || 'DataTypes.STRING';
}
function toCamelCase(s) {
    return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
function singularize(s) {
    if (s.endsWith('ies'))
        return s.slice(0, -3) + 'y';
    if (s.endsWith('ses') || s.endsWith('xes') || s.endsWith('zes'))
        return s.slice(0, -2);
    if (s.endsWith('s') && !s.endsWith('ss') && !s.endsWith('us'))
        return s.slice(0, -1);
    return s;
}
function pluralizeLower(s) {
    const lower = s.charAt(0).toLowerCase() + s.slice(1);
    if (lower.endsWith('y') && !/[aeiou]y$/i.test(lower))
        return lower.slice(0, -1) + 'ies';
    if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('z') || lower.endsWith('sh') || lower.endsWith('ch'))
        return lower + 'es';
    return lower + 's';
}
