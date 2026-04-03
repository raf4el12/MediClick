import { api } from '@/libs/axios';

interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

export async function graphqlQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await api.post<GraphQLResponse<T>>('/graphql', {
    query,
    variables,
  });

  const { data, errors } = response.data;

  const firstError = errors?.[0];
  if (firstError) {
    throw new Error(firstError.message);
  }

  return data;
}
