import { getClient } from "@/faust/client";
import { gql } from "@apollo/client";
import Link from "next/link";

export default async function Home() {
  let client = getClient();

  const { data } = await client.query({
    query: gql`
      query GetPosts {
        posts {
          nodes {
            id
            title
            uri
            slug
          }
        }
      }
    `,
  });

  return (
    <main>
      <ul>
        {data.posts.nodes.map(
          (post: { title: string; uri: string; slug: string }) => (
            <li>
              <Link href={`/${post.slug}`}>{post.title}</Link>
            </li>
          )
        )}
      </ul>
    </main>
  );
}
