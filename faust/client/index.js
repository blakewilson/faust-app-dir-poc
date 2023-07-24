import { HttpLink } from "@apollo/client";
import { registerApolloClient } from "@apollo/experimental-nextjs-app-support/rsc";
import {
  NextSSRApolloClient,
  NextSSRInMemoryCache,
} from "@apollo/experimental-nextjs-app-support/ssr";
import { fetchAccessToken } from "../auth/fetchAccessToken";

export const { getClient } = registerApolloClient(() => {
  return new NextSSRApolloClient({
    cache: new NextSSRInMemoryCache(),
    link: new HttpLink({
      // https://studio.apollographql.com/public/spacex-l4uc6p/
      uri: `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/graphql`,
      // you can disable result caching here if you want to
      // (this does not work if you are rendering your page with `export const dynamic = "force-static"`)
      // fetchOptions: { cache: "no-store" },
    }),
  });
});

export const getAuthClient = async () => {
  const accessToken = await fetchAccessToken();

  if (!accessToken) {
    return null;
  }

  console.log(accessToken);

  const { getClient } = registerApolloClient(() => {
    return new NextSSRApolloClient({
      cache: new NextSSRInMemoryCache(),
      link: new HttpLink({
        // https://studio.apollographql.com/public/spacex-l4uc6p/
        uri: `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/graphql`,
        // you can disable result caching here if you want to
        // (this does not work if you are rendering your page with `export const dynamic = "force-static"`)
        // fetchOptions: { cache: "no-store" },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    });
  });

  return getClient();
};
