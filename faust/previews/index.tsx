export function isPreviewMode(props: any) {
  return props?.searchParams?.preview && props?.searchParams?.p;
}
