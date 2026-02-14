import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { graphql, GraphQLError } from "graphql";
import { makeExecutableSchema } from "@graphql-tools/schema";
import expressPlayground from "graphql-playground-middleware-express";

import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";
import { buildContext } from "./context";
import { AppError } from "./errors";
import { logger } from "./utils";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Build executable schema from typeDefs + resolvers
const schema = makeExecutableSchema({ typeDefs, resolvers });

// GraphQL endpoint
app.post("/graphql", async (req, res) => {
  const { query, variables, operationName } = req.body;
  const context = buildContext(req, res);

  const result = await graphql({
    schema,
    source: query,
    variableValues: variables,
    operationName,
    contextValue: context,
  });

  // ── Normalize ALL errors into a consistent shape ──────
  //
  //  Every error the client receives will always have:
  //    extensions.code   – one of ErrorCode (string enum)
  //    extensions.status – matching HTTP-style status number
  //
  //  • AppError        → forwarded as-is (NOT_FOUND, UNAUTHORIZED, …)
  //  • Everything else  → masked as INTERNAL_ERROR (no leak of internals)

  if (result.errors) {
    result.errors = result.errors.map((err) => {
      const original = err.originalError;

      // Known, intentional application errors — log at warn level
      if (original instanceof AppError) {
        logger.graphql.warn(
          `AppError [${original.code}] path=${err.path?.join(".")}`,
          { message: original.message, status: original.status },
        );

        return new GraphQLError(original.message, {
          nodes: err.nodes,
          source: err.source,
          positions: err.positions,
          path: err.path,
          extensions: {
            code: original.code,
            status: original.status,
          },
        });
      }

      // Unexpected / unknown errors — always log, mask in production
      const isProd = process.env.NODE_ENV === "production";
      const safeMessage = isProd
        ? "An unexpected error occurred."
        : err.message || "An unexpected error occurred.";

      logger.graphql.error(
        `Unhandled resolver error at path=${err.path?.join(".")}`,
        original ?? err,
      );

      return new GraphQLError(safeMessage, {
        nodes: err.nodes,
        source: err.source,
        positions: err.positions,
        path: err.path,
        extensions: {
          code: "INTERNAL_ERROR",
          status: 500,
        },
      });
    });
  }

  res.json(result);
});

// GraphQL Playground (GET /playground)
app.get("/playground", expressPlayground({ endpoint: "/graphql" }));

app.listen(PORT, () => {
  logger.server.info(`Server running at http://localhost:${PORT}/graphql`);
  logger.server.info(`Playground at http://localhost:${PORT}/playground`);
});
