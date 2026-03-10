import Head from "next/head";

type PageMetaProps = {
  title: string;
  description: string;
  ogTitle?: string;
};

const SITE_TITLE = "최찬식의 인터뷰어 피드백 보드 프로젝트";

export default function PageMeta({ title, description, ogTitle }: PageMetaProps) {
  return (
    <Head>
      <title>{`${title} | ${SITE_TITLE}`}</title>
      <meta name="description" content={description} key="description" />
      <meta property="og:title" content={ogTitle ?? title} key="og:title" />
      <meta property="og:description" content={description} key="og:description" />
    </Head>
  );
}
