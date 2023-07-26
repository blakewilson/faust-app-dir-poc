# Faust App Router POC

## Prerequisites

First, make sure your WordPress site has [WPGraphQL](https://wordpress.org/plugins/wp-graphql) and [FaustWP](https://wordpress.org/plugins/faustwp) installed.

Make a copy of the `.env.local.sample` file and name it `.env.local`. Set the `NEXT_PUBLIC_WORDPRESS_URL` and `FAUST_SECRET_KEY`.

```
NEXT_PUBLIC_WORDPRESS_URL=http://my-site.com/
FAUST_SECRET_KEY=xxxx
```

## Usage

### Data Fetching

Data fetching in app router is quite simple, the experimental Apollo implementation for App Router does not require a `Provider` that wraps the app, the implementation is simply a function that returns an `apolloClient`. In our implementation, we simple call our own function and apply any plugin filters/logic needed to the `apolloClient`.

Since React Server Components are awaitable, it's as simple as:

```tsx
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
```

to fetch data. Check out [`getClient`](https://github.com/blakewilson/faust-app-dir-poc/blob/main/faust/client/index.js#L9-L20) for implementation details.

### Authentication

For this POC, the logic to login is not implemented, however, the goal is to use the same `useLogin`, `useLogout` and local/redirect strategies from current Faust.

For this demonstration, you'll want to generate a refresh token through the Faust REST endpoint, and manually add that as a cookie on your site called `${wpUrl}-rt` so that an access token can be fetched properly.

Say for instance your WP instance exists on `http://headless.local`, the cookie name to store the refresh token would be `http://headless.local-rt`.

To generate a refresh token, you'll need to first generate an authorization code, which can be done through the GraphiQL IDE with the following query:

```graphql
mutation MyMutation {
  generateAuthorizationCode(
    input: { username: "my_username", password: "my_password" }
  ) {
    clientMutationId
    code
    error
  }
}
```

This will give you a response similar to:

```json
{
  "data": {
    "generateAuthorizationCode": {
      "clientMutationId": null,
      "code": "my_code",
      "error": null
    }
  }
}
```

Then, with your `code`, create a `POST` request to the `http://my-wp-site.com/?rest_route=/faustwp/v1/authorize` endpoint (replacing `http://my-wp-site.com` with the URL to your WordPress site). Use the `code` in the body of the `POST` request, and set the `x-faust-secret` header with your `FAUST_SECRET_KEY`:

```
POST /?rest_route=/faustwp/v1/authorize HTTP/1.1
Host: headless.local
Content-Type: application/json
x-faustwp-secret: xxxx-xxxx-xxxx-xxx
Content-Length: 25

{
    "code": "my_code"
}
```

You should receive a response similar to:

```json
{
  "accessToken": "my_access_token",
  "accessTokenExpiration": 1690379081,
  "refreshToken": "my_refresh_token",
  "refreshTokenExpiration": 1691588381
}
```

`my_refresh_token` is the value you save in the `${wpUrl}-rt` cookie mentioned above.

A valid refresh token saved in the cookie means the user has a valid "session" and can be authenticated. To make authenticated requests, two things must occur:

1. Fetch the access token. This is an awaitable function that can be called via the [`fetchAccessToken()`](https://github.com/blakewilson/faust-app-dir-poc/blob/main/faust/auth/fetchAccessToken.ts#L3) function. Once this access token is fetched, it is applied to the auth client. (Ideally this would be abstracted in the actual implementation for Faust but we are doing it manually for simplicity). Since App Router also has a new way to cache requests in RSCs, we could potentially get the expiration time and cache the fetch access token request until it is set to expire.
2. Use the awaitable [`getAuthClient`](https://github.com/blakewilson/faust-app-dir-poc/blob/main/faust/client/index.js#L22) to get the authenticated client. This client can be used to make authenticated requests. If the returned `client` is `null`, it means that the user could not be properly authenticated, and a message saying the user is not authenticated or redirect should occur. Like:

```tsx
let client = await getAuthClient();

if (!client) {
  return <>You are not authenticated</>;
}
```

### Previews

**Note: Make sure you set a refresh token discussed in the ["Authentication"](https://github.com/blakewilson/faust-app-dir-poc#authentication) section above before proceeding to this step**

Previews in App Router work quite similarly to fetching authenticated data (like in the section above). Since the data queries are the same for fetching production data and preview data, the only difference is the `asPreview` flag in your WPGraphQL queries.

With this in mind, we have a function called `isPreviewMode` which accepts the `page.js`'s props, and determines if it is a preview page (has `?preview=true&p=xxx` in the search params). If it has those search params, the function returns `true`, otherwise, `false`.

With this in mind, we can fetch both preview and production data in one query:

```tsx
export default async function Page(props) {
  const postSlug = props.params.postSlug;
  const isPreview = isPreviewMode(props);

  if (isPreview) {
    await fetchAccessToken();
  }

  let client = isPreview ? await getAuthClient() : getClient();

  if (!client) {
    return <>You are not authenticated</>;
  }

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

  // render "data" here
  return <></>;
}
```

Refer to [`[postSlug]/page.tsx`](https://github.com/blakewilson/faust-app-dir-poc/blob/main/app/%5BpostSlug%5D/page.tsx) for more implementation details.
