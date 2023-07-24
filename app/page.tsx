import Image from "next/image";
import styles from "./page.module.css";
import { gql } from "@apollo/client";
import Link from "next/link";
import { getAuthClient, getClient } from "@/faust/client";
import { fetchAccessToken } from "@/faust/auth/fetchAccessToken";

export default async function Home() {
  let client = await getAuthClient();

  if (!client) {
    return <>You need to be authenticated</>;
  }

  const { data } = await client.query({
    query: gql`
      query GetPosts {
        posts {
          nodes {
            id
            title
            uri
          }
        }
        viewer {
          name
        }
      }
    `,
  });

  console.log(data);

  return (
    <main>
      <h2>Welcome {data?.viewer?.name}</h2>
      <ul>
        {data.posts.nodes.map((post: { title: string; uri: string }) => (
          <li>
            <Link href={post.uri}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
