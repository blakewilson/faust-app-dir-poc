import { fetchAccessToken } from "@/faust/auth/fetchAccessToken";
import { getAuthClient, getClient } from "@/faust/client";
import { isPreviewMode } from "@/faust/previews";
import { gql } from "@apollo/client";

type PageProps = {
  params: {
    postSlug?: string;
  };
  searchParams?: {
    preview?: string;
    p?: string;
  };
};

export default async function Page(props: PageProps) {
  const postSlug = props.params.postSlug;
  const isPreview = isPreviewMode(props);

  // Fetch the access token if is preview. Ideally this would be abstracted
  // so the user wouldn't have to call it themselves.
  if (isPreview) {
    await fetchAccessToken();
  }

  // Depending on if isPreview or not use the auth client or regular client
  let client = isPreview ? await getAuthClient() : getClient();

  // Auth client will return null if not authenticated
  if (!client) {
    return <>You are not authenticated</>;
  }

  /**
   * Previewing via slug/uri doesn't currently work in WPGraphQL
   * @link https://github.com/wp-graphql/wp-graphql/issues/1673
   */
  const { data } = await client.query({
    query: gql`
      query GetPost($postSlug: ID!, $asPreview: Boolean!) {
        post(id: $postSlug, idType: SLUG, asPreview: $asPreview) {
          title
          content
          date
        }
      }
    `,
    variables: {
      postSlug,
      asPreview: Boolean(isPreview),
    },
    fetchPolicy: isPreview ? "no-cache" : undefined,
  });

  return (
    <main>
      <h2>{data?.post?.title}</h2>
      <div dangerouslySetInnerHTML={{ __html: data?.post?.content }} />
    </main>
  );
}
