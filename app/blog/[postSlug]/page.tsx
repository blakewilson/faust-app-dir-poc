import { fetchAccessToken } from "@/faust/auth/fetchAccessToken";
import { getAuthClient, getClient } from "@/faust/client";
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
  const isPreview = props?.searchParams?.preview;

  if (isPreview) {
    await fetchAccessToken();
  }

  let client = isPreview ? await getAuthClient() : getClient();

  if (!client) {
    return <>You are not authenticated</>;
  }

  let data;

  if (isPreview) {
    console.log("p id", props?.searchParams?.p);
    const res = await client.query({
      query: gql`
        query GetPost($postId: ID!) {
          post(id: $postId, idType: DATABASE_ID, asPreview: true) {
            title
            content
            date
          }
        }
      `,
      variables: {
        postId: props?.searchParams?.p,
      },
    });

    data = res.data;
  } else {
    const res = await client.query({
      query: gql`
        query GetPost($postSlug: ID!) {
          post(id: $postSlug, idType: SLUG) {
            title
            content
            date
          }
        }
      `,
      variables: {
        postSlug,
      },
    });

    data = res.data;
  }

  return (
    <main>
      <h2>{data?.post?.title}</h2>
      <div dangerouslySetInnerHTML={{ __html: data?.post?.content }} />
    </main>
  );
}
