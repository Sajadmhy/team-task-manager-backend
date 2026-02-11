import "dotenv/config";
import express from "express";
import cors from "cors";
import { graphql, GraphQLError } from "graphql";
import { makeExecutableSchema } from "@graphql-tools/schema";
import expressPlayground from "graphql-playground-middleware-express";

import { typeDefs } from "./schema/schema";
import { resolvers } from "./resolvers/index";
import { buildContext } from "./context";
import { AppError } from "./errors";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Build executable schema from typeDefs + resolvers
const schema = makeExecutableSchema({ typeDefs, resolvers });

// GraphQL endpoint
app.post("/graphql", async (req, res) => {
  const { query, variables, operationName } = req.body;
  const context = buildContext(req);

  const result = await graphql({
    schema,
    source: query,
    variableValues: variables,
    operationName,
    contextValue: context,
  });

  // Enrich GraphQL errors with AppError code & status
  if (result.errors) {
    result.errors = result.errors.map((err) => {
      const original = err.originalError;
      if (original instanceof AppError) {
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
      return err;
    });
  }

  res.json(result);
});

// GraphQL Playground (GET /playground)
app.get("/playground", expressPlayground({ endpoint: "/graphql" }));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/graphql`);
  console.log(`Playground at http://localhost:${PORT}/playground`);
});
