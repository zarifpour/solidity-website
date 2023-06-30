import fs from 'fs'
import type { GetStaticPaths, GetStaticProps, NextPage } from 'next'
import { ParsedUrlQuery } from 'querystring'
import { CategoryPath, BlogPostProps } from '@/interfaces'
import { BlogPostPreview, Hero, PageMetadata, Section } from '@/components'
import { BLOG_POSTS_DIR, BLOG_TITLE, URL_CATEGORIES_MAP } from '@/constants'
import { generateRssFeed, getAllPostsData } from '@/utils'

// generate the paths for each category
export const getStaticPaths: GetStaticPaths = () => {
  // check if any .md post file exists, don't generate the paths otherwise
  if (!fs.existsSync(BLOG_POSTS_DIR)) {
    return {
      paths: [],
      fallback: false,
    }
  }

  // generate a path for each one
  const paths: CategoryPath[] = []
  Object.keys(URL_CATEGORIES_MAP).forEach((key) => {
    paths.push({ params: { category: key } })
  })

  // return list of paths
  return {
    paths,
    fallback: false,
  }
}

// generate the static props for the page
export const getStaticProps: GetStaticProps = async (context) => {
  const { category } = context.params as ParsedUrlQuery
  // get list of all files from our posts directory
  const files = fs.readdirSync(BLOG_POSTS_DIR)
  const sortedFiles = files.sort().reverse()
  const allPostsData = getAllPostsData(sortedFiles, fs)
  const categoryPostsData = allPostsData.filter(
    ({ frontmatter }) =>
      frontmatter.category ===
      URL_CATEGORIES_MAP[category as keyof typeof URL_CATEGORIES_MAP]
  )

  // Generate RSS feeds
  const fullFeed = await generateRssFeed(allPostsData)
  const directory = `./public/`
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(`${directory}/feed.xml`, fullFeed.rss2())
  const categoryFeed = await generateRssFeed(
    allPostsData,
    category as keyof typeof URL_CATEGORIES_MAP
  )
  const categoryDirectory = `./public/${category}/`
  fs.mkdirSync(categoryDirectory, { recursive: true })
  fs.writeFileSync(`${categoryDirectory}/feed.xml`, categoryFeed.rss2())

  return {
    props: {
      categoryPostsData,
      category,
    },
  }
}

interface Props {
  categoryPostsData: BlogPostProps[]
  category: keyof typeof URL_CATEGORIES_MAP
}

const CategoryPage: NextPage<Props> = ({ categoryPostsData, category }) => {
  return (
    <>
      <PageMetadata
        title={`Blog: ${category}`}
        description="Solidity Lang blog: latest news & announcements"
      />
      <main>
        <Hero header={BLOG_TITLE}>All {category} posts</Hero>
        <Section
          direction="column"
          gap={16}
          maxW="container.md"
          pt={12}
          pb={64}
          fontSize="md"
          mx="auto"
        >
          {categoryPostsData.map(({ frontmatter, content, url }) => (
            <BlogPostPreview
              key={url}
              frontmatter={frontmatter}
              content={content}
              url={url}
              isCategoryPage
            />
          ))}
        </Section>
      </main>
    </>
  )
}

export default CategoryPage
