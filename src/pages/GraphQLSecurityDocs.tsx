import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import js from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import python from "react-syntax-highlighter/dist/esm/languages/hljs/python";
import graphql from "react-syntax-highlighter/dist/esm/languages/hljs/graphql";
import bash from "react-syntax-highlighter/dist/esm/languages/hljs/bash";
import sql from "react-syntax-highlighter/dist/esm/languages/hljs/sql";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import {
  ArrowLeft,
  Copy,
  Check,
  Shield,
  AlertTriangle,
  Lock,
  Zap,
  Database,
  Clock,
  Eye,
  EyeOff,
  Layers,
  Server,
  FileCode,
} from "lucide-react";

SyntaxHighlighter.registerLanguage("javascript", js);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("graphql", graphql);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("sql", sql);

// --- Types ---
interface CodeBlockProps {
  code: string;
  language: string;
  title?: string;
}

interface SectionProps {
  id: string;
  number: number;
  title: string;
  icon: React.ReactNode;
  vulnerability: string;
  children: React.ReactNode;
}

// --- Code Block Component ---
const CodeBlock = ({ code, language, title }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-border my-4 shadow-soft">
      {title && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-secondary border-b border-border">
          <span className="font-mono text-xs text-muted-foreground tracking-wider uppercase">{title}</span>
          <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors active-press">
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      <SyntaxHighlighter
        language={language}
        style={atomOneDark}
        customStyle={{
          margin: 0,
          padding: "1.25rem",
          fontSize: "0.8125rem",
          lineHeight: "1.7",
          background: "hsl(240 10% 5%)",
          borderRadius: title ? 0 : "1rem",
        }}
        showLineNumbers={code.split("\n").length > 3}
        lineNumberStyle={{ color: "hsl(240 5% 30%)", paddingRight: "1rem", fontSize: "0.75rem" }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

// --- Section Component ---
const DocSection = ({ id, number, title, icon, vulnerability, children }: SectionProps) => (
  <motion.section
    id={id}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.4 }}
    className="scroll-mt-24"
  >
    <div className="flex items-start gap-4 mb-4">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-1">
        {icon}
      </div>
      <div>
        <span className="text-label text-muted-foreground">Rule {String(number).padStart(2, "0")}</span>
        <h2 className="text-xl font-semibold tracking-tight mt-1">{title}</h2>
      </div>
    </div>
    <div className="ml-14">
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-warning/5 border border-warning/20 mb-6">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <p className="text-sm text-foreground/80"><strong className="text-foreground">Vulnerability:</strong> {vulnerability}</p>
      </div>
      {children}
    </div>
  </motion.section>
);

// --- TOC Data ---
const tocItems = [
  { id: "introspection", label: "Disable Introspection" },
  { id: "depth-limiting", label: "Query Depth Limiting" },
  { id: "rate-limiting", label: "Rate Limiting" },
  { id: "field-auth", label: "Field-Level Authorization" },
  { id: "pagination", label: "Pagination" },
  { id: "injection", label: "Prevent Injection" },
  { id: "alias-limiting", label: "Limit Aliases" },
  { id: "error-handling", label: "Secure Errors" },
  { id: "cost-analysis", label: "Cost Analysis" },
  { id: "persisted-queries", label: "Persisted Queries" },
  { id: "timeouts", label: "Timeouts" },
  { id: "batching", label: "Disable Batching" },
];

// --- Main Page ---
const GraphQLSecurityDocs = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors active-press">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold tracking-tight">SafeRoute Docs</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12 lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
        {/* Sidebar TOC */}
        <aside className="hidden lg:block sticky top-24 self-start">
          <p className="text-label text-muted-foreground mb-4">On This Page</p>
          <nav className="space-y-1">
            {tocItems.map((item, i) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <span className="font-mono text-[10px] text-muted-foreground/60 w-5">{String(i + 1).padStart(2, "0")}</span>
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main>
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16"
          >
            <span className="text-label text-primary mb-3 block">Security Guide</span>
            <h1 className="text-display-xl !text-[clamp(1.75rem,5vw,2.75rem)] mb-4">
              Securing GraphQL APIs
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-6">
              Remediation code examples and best practices to fix the most common GraphQL
              vulnerabilities. Each section includes practical, copy‑paste‑ready code for
              Node.js and Python.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium text-secondary-foreground">Apollo Server</span>
              <span className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium text-secondary-foreground">Express GraphQL</span>
              <span className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium text-secondary-foreground">Yoga</span>
              <span className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium text-secondary-foreground">Ariadne</span>
              <span className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium text-secondary-foreground">Strawberry</span>
            </div>
          </motion.div>

          <div className="space-y-16">
            {/* 1. Disable Introspection */}
            <DocSection
              id="introspection"
              number={1}
              title="Disable Introspection in Production"
              icon={<EyeOff className="w-5 h-5 text-primary" />}
              vulnerability="Introspection exposes your entire schema to attackers."
            >
              <CodeBlock
                title="Apollo Server (Node.js)"
                language="javascript"
                code={`const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production', // 👈 disable in prod
});

startStandaloneServer(server);`}
              />
              <CodeBlock
                title="Express GraphQL (Node.js)"
                language="javascript"
                code={`const { graphqlHTTP } = require('express-graphql');

app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    graphiql: process.env.NODE_ENV !== 'production', // 👈 disable GraphiQL + introspection
  })
);`}
              />
              <CodeBlock
                title="Yoga (Node.js)"
                language="javascript"
                code={`import { createServer } from 'node:http';
import { createYoga } from 'graphql-yoga';

const yoga = createYoga({
  schema,
  graphiql: process.env.NODE_ENV !== 'production', // 👈 false in prod
});`}
              />
              <CodeBlock
                title="Python (Ariadne + Flask)"
                language="python"
                code={`from ariadne import graphql_sync
from ariadne.constants import PLAYGROUND_HTML
from flask import request, jsonify

@app.route("/graphql", methods=["GET"])
def graphql_playground():
    if app.debug:  # Only enable playground in debug mode
        return PLAYGROUND_HTML, 200
    return "Not found", 404

@app.route("/graphql", methods=["POST"])
def graphql_server():
    data = request.get_json()
    success, result = graphql_sync(schema, data, context_value=request)
    return jsonify(result), 200 if success else 400`}
              />
            </DocSection>

            {/* 2. Query Depth Limiting */}
            <DocSection
              id="depth-limiting"
              number={2}
              title="Implement Query Depth Limiting"
              icon={<Layers className="w-5 h-5 text-primary" />}
              vulnerability="Deeply nested queries can cause denial of service."
            >
              <CodeBlock title="Install" language="bash" code="npm install graphql-depth-limit" />
              <CodeBlock
                title="Apollo Server (Node.js)"
                language="javascript"
                code={`const depthLimit = require('graphql-depth-limit');
const { ApolloServer } = require('@apollo/server');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(5)], // 👈 max depth 5
});`}
              />
              <CodeBlock
                title="Express GraphQL"
                language="javascript"
                code={`const depthLimit = require('graphql-depth-limit');

app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    validationRules: [depthLimit(5)],
  })
);`}
              />
              <CodeBlock
                title="Python (Strawberry)"
                language="python"
                code={`import strawberry
from strawberry.tools import depth_limit_validator

@strawberry.type
class Query:
    ...

schema = strawberry.Schema(
    query=Query,
    validation_directives=[depth_limit_validator(5)]
)`}
              />
            </DocSection>

            {/* 3. Rate Limiting */}
            <DocSection
              id="rate-limiting"
              number={3}
              title="Add Rate Limiting"
              icon={<Zap className="w-5 h-5 text-primary" />}
              vulnerability="Without rate limiting, APIs are vulnerable to brute force and resource exhaustion."
            >
              <CodeBlock title="Install" language="bash" code="npm install express-rate-limit" />
              <CodeBlock
                title="Express Middleware"
                language="javascript"
                code={`const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to all GraphQL requests
app.use('/graphql', limiter);`}
              />
              <CodeBlock
                title="Apollo Server Plugin"
                language="javascript"
                code={`const { RateLimiterMemory } = require('rate-limiter-flexible');

const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60, // per minute
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    {
      async requestDidStart() {
        return {
          async didResolveOperation(context) {
            const key = context.request.http.headers.get('x-forwarded-for') || 'global';
            try {
              await rateLimiter.consume(key);
            } catch {
              throw new Error('Too many requests');
            }
          },
        };
      },
    },
  ],
});`}
              />
            </DocSection>

            {/* 4. Field-Level Auth */}
            <DocSection
              id="field-auth"
              number={4}
              title="Field‑Level Authorization"
              icon={<Lock className="w-5 h-5 text-primary" />}
              vulnerability="Sensitive fields accessible without proper authorization checks."
            >
              <CodeBlock
                title="Schema Directive Definition"
                language="graphql"
                code={`directive @auth(requires: Role = ADMIN) on OBJECT | FIELD_DEFINITION

enum Role {
  ADMIN
  USER
  GUEST
}

type User {
  id: ID!
  email: String! @auth(requires: ADMIN)
  profile: Profile!
}`}
              />
              <CodeBlock
                title="Directive Implementation (Node.js)"
                language="javascript"
                code={`const { mapSchema, getDirectives, MapperKind } = require('@graphql-tools/utils');
const { defaultFieldResolver } = require('graphql');

function authDirectiveTransformer(schema) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const directives = getDirectives(schema, fieldConfig);
      const authDirective = directives['auth'];
      if (authDirective) {
        const { requires } = authDirective;
        const originalResolver = fieldConfig.resolve || defaultFieldResolver;
        fieldConfig.resolve = async (source, args, context, info) => {
          if (!context.user) throw new Error('Not authenticated');
          if (requires === 'ADMIN' && context.user.role !== 'ADMIN') {
            throw new Error('Insufficient permissions');
          }
          return originalResolver(source, args, context, info);
        };
      }
      return fieldConfig;
    },
  });
}

let schema = makeExecutableSchema({ typeDefs, resolvers });
schema = authDirectiveTransformer(schema);`}
              />
              <CodeBlock
                title="Python (Ariadne)"
                language="python"
                code={`from ariadne import make_executable_schema, gql

type_defs = gql("""
    directive @auth(requires: Role!) on FIELD_DEFINITION
    enum Role { ADMIN USER }
    type User {
        id: ID!
        email: String! @auth(requires: ADMIN)
    }
""")

@directive("auth")
def auth_directive(resolver, obj, info, **kwargs):
    requires = kwargs.get("requires")
    request = info.context["request"]
    user = getattr(request, "user", None)
    if not user:
        raise Exception("Not authenticated")
    if requires == "ADMIN" and user.role != "ADMIN":
        raise Exception("Not authorized")
    return resolver(obj, info)

schema = make_executable_schema(type_defs, [auth_directive])`}
              />
            </DocSection>

            {/* 5. Pagination */}
            <DocSection
              id="pagination"
              number={5}
              title="Implement Pagination on List Fields"
              icon={<FileCode className="w-5 h-5 text-primary" />}
              vulnerability="Unbounded list queries allow attackers to retrieve entire datasets."
            >
              <CodeBlock
                title="Relay Connection Schema"
                language="graphql"
                code={`type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

extend type Query {
  users(first: Int, after: String): UserConnection!
}`}
              />
              <CodeBlock
                title="Resolver (Node.js)"
                language="javascript"
                code={`const resolvers = {
  Query: {
    users: async (_, { first = 10, after }, { db }) => {
      const limit = Math.min(first, 50); // enforce maximum
      const cursor = after ? Buffer.from(after, 'base64').toString() : null;

      const query = db('users').orderBy('id').limit(limit + 1);
      if (cursor) query.where('id', '>', cursor);

      const users = await query;
      const hasNextPage = users.length > limit;
      const edges = users.slice(0, limit).map(user => ({
        node: user,
        cursor: Buffer.from(String(user.id)).toString('base64'),
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          startCursor: edges[0]?.cursor,
          endCursor: edges[edges.length - 1]?.cursor,
        },
      };
    },
  },
};`}
              />
            </DocSection>

            {/* 6. Prevent Injection */}
            <DocSection
              id="injection"
              number={6}
              title="Prevent SQL/NoSQL Injection"
              icon={<Database className="w-5 h-5 text-primary" />}
              vulnerability="String interpolation in queries allows injection attacks."
            >
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-destructive/5 border border-destructive/20 mb-4">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm"><strong>Bad — vulnerable to injection:</strong></p>
              </div>
              <CodeBlock
                title="❌ Never Do This"
                language="javascript"
                code={`const userInput = args.name;
const query = \`SELECT * FROM users WHERE name = '\${userInput}'\`;`}
              />

              <p className="text-sm font-semibold text-success mt-6 mb-2">✅ Use parameterized queries:</p>
              <CodeBlock title="Knex.js" language="javascript" code={`const users = await knex('users').where('name', args.name);`} />
              <CodeBlock title="Mongoose" language="javascript" code={`const users = await User.find({ name: args.name }); // safe`} />
              <CodeBlock title="Prisma" language="javascript" code={`const users = await prisma.user.findMany({
  where: { name: args.name },
});`} />
            </DocSection>

            {/* 7. Limit Aliases */}
            <DocSection
              id="alias-limiting"
              number={7}
              title="Limit Alias Usage"
              icon={<Eye className="w-5 h-5 text-primary" />}
              vulnerability="Alias-based batching attacks can bypass rate limiting."
            >
              <CodeBlock title="Install" language="bash" code="npm install graphql-query-cost" />
              <CodeBlock
                title="Express GraphQL"
                language="javascript"
                code={`const { createComplexityLimitRule } = require('graphql-query-cost');

app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    validationRules: [
      createComplexityLimitRule(1000, {
        onCost: (cost) => console.log('Query cost:', cost),
      }),
    ],
  })
);`}
              />
            </DocSection>

            {/* 8. Secure Error Handling */}
            <DocSection
              id="error-handling"
              number={8}
              title="Secure Error Handling"
              icon={<Shield className="w-5 h-5 text-primary" />}
              vulnerability="Stack traces and internal error details exposed to clients."
            >
              <CodeBlock
                title="Apollo Server"
                language="javascript"
                code={`const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formattedError) => {
    // Don't expose internal errors
    if (formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
      return new GraphQLError('Internal server error');
    }
    return formattedError;
  },
});`}
              />
              <CodeBlock
                title="Express GraphQL"
                language="javascript"
                code={`app.use(
  '/graphql',
  graphqlHTTP((req, res) => ({
    schema,
    graphiql: false,
    customFormatErrorFn: (error) => ({
      message: error.message,
      locations: error.locations,
      path: error.path,
      // Do NOT include stack or internal codes
    }),
  }))
);`}
              />
            </DocSection>

            {/* 9. Cost Analysis */}
            <DocSection
              id="cost-analysis"
              number={9}
              title="Add Query Cost Analysis"
              icon={<Zap className="w-5 h-5 text-primary" />}
              vulnerability="Expensive queries can exhaust server resources without cost controls."
            >
              <CodeBlock title="Install" language="bash" code="npm install graphql-cost-analysis" />
              <CodeBlock
                title="Apollo Server"
                language="javascript"
                code={`const costAnalysis = require('graphql-cost-analysis').default;

const costAnalyzer = costAnalysis({
  maximumCost: 1000,
  variables: {},
  onComplete: (cost) => {
    console.log('Query cost:', cost);
  },
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [costAnalyzer],
});`}
              />
              <CodeBlock
                title="Schema Directives"
                language="graphql"
                code={`directive @cost(complexity: Int!) on FIELD_DEFINITION

type Query {
  users: [User!]! @cost(complexity: 10)
  user(id: ID!): User @cost(complexity: 5)
}`}
              />
            </DocSection>

            {/* 10. Persisted Queries */}
            <DocSection
              id="persisted-queries"
              number={10}
              title="Implement Persisted Queries"
              icon={<Server className="w-5 h-5 text-primary" />}
              vulnerability="Arbitrary queries increase attack surface and allow schema probing."
            >
              <CodeBlock
                title="Apollo Server"
                language="javascript"
                code={`const { ApolloServer } = require('@apollo/server');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  persistedQueries: {
    cache: new Map(), // use Redis in production
  },
});`}
              />
              <CodeBlock
                title="Apollo Client"
                language="javascript"
                code={`import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries';
import { createHttpLink } from '@apollo/client/link/http';
import { InMemoryCache } from '@apollo/client/cache';
import ApolloClient from '@apollo/client/core';

const link = createPersistedQueryLink().concat(
  createHttpLink({ uri: '/graphql' })
);

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link,
});`}
              />
            </DocSection>

            {/* 11. Timeouts */}
            <DocSection
              id="timeouts"
              number={11}
              title="Timeouts and Connection Limits"
              icon={<Clock className="w-5 h-5 text-primary" />}
              vulnerability="Long-running queries can lock server resources indefinitely."
            >
              <CodeBlock
                title="Express Middleware"
                language="javascript"
                code={`const timeout = require('connect-timeout');

app.use('/graphql', timeout('10s'), (req, res, next) => {
  if (!req.timedout) next();
});`}
              />
              <CodeBlock
                title="Apollo Server Timeout Plugin"
                language="javascript"
                code={`const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    {
      async requestDidStart() {
        const start = Date.now();
        return {
          async didResolveOperation(context) {
            const duration = Date.now() - start;
            if (duration > 5000) {
              throw new Error('Query exceeded time limit');
            }
          },
        };
      },
    },
  ],
});`}
              />
            </DocSection>

            {/* 12. Disable Batching */}
            <DocSection
              id="batching"
              number={12}
              title="Disable Batching (If Not Needed)"
              icon={<EyeOff className="w-5 h-5 text-primary" />}
              vulnerability="Batching multiple queries in one request can bypass per-request security controls."
            >
              <p className="text-muted-foreground text-sm mb-4">
                Apollo Server has batching disabled by default. For Express GraphQL, batching is also not supported by default.
                If you've explicitly enabled batching and don't need it, disable it.
              </p>
              <CodeBlock
                title="Express GraphQL (Default — No Batching)"
                language="javascript"
                code={`app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    graphiql: false,
  })
);
// Batching is not supported by default.`}
              />
            </DocSection>
          </div>

          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20 p-8 rounded-3xl bg-foreground text-background"
          >
            <Shield className="w-8 h-8 text-primary mb-4" />
            <h2 className="text-2xl font-semibold tracking-tight mb-3">Summary</h2>
            <p className="text-background/70 leading-relaxed mb-6">
              Implementing these fixes will drastically improve the security posture of your GraphQL API.
              Combine them with regular security audits using tools like SafeRoute to stay protected.
              Each code snippet is ready to be integrated into your existing codebase.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tocItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="px-3 py-2 rounded-xl bg-background/10 text-sm text-background/80 hover:bg-background/20 transition-colors text-center"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </motion.div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-border flex items-center justify-between">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to RecycleMate
            </Link>
            <span className="font-mono text-xs text-muted-foreground">SafeRoute Security Guide v1.0</span>
          </div>
        </main>
      </div>
    </div>
  );
};

export default GraphQLSecurityDocs;
