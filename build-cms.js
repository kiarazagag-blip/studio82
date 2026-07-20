const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const cheerio = require('cheerio');

const collections = [
  {
    name: 'Blogs',
    csv: 'cms-data/DESIGNSIMPLY - Blogs - 675d6f062f799cf7e40c38c2.csv',
    template: 'detail_blog.html',
    outDir: 'blog',
    mappings: {
      'Name': { selector: '.blog-template-main-heading', attr: 'text' },
      'Post body': { selector: '.post-title', attr: 'html' },
      'Small title': { selector: '.pre-title', attr: 'text' },
      'Main Image': { selector: '.blog-page-main-image img', attr: 'src' },
      'Writer name': { selector: '.writter-info div:first-child', attr: 'text' },
      'Published On': { selector: '.writter-info .date', attr: 'text' },
      'Writer image': { selector: '.writter-image img', attr: 'src' }
    },
    indexPages: [
      {
        file: 'others/blog.html',
        listSelector: '.blog-page-collection-list',
        itemSelector: '.blog-page-collection-item',
        linkSelector: 'a.blog-small-card',
        mappings: {
          'Name': { selector: '.blog-page-card-main-title', attr: 'text' },
          'Main Image': { selector: '.blog-image-main-picture img', attr: 'src' }
        }
      },
      {
        file: 'index.html',
        listSelector: '.blogging-sections .splide__track.w-dyn-list',
        itemSelector: '.splide__slide.w-dyn-item',
        linkSelector: 'a.works-slider-link-block',
        mappings: {
          'Name': { selector: '.works-slider-title.blogies-slider', attr: 'text' },
          'Main Image': { selector: 'img.image-7._9090', attr: 'src' }
        }
      },
      {
        file: 'index.html',
        listSelector: '.container-9:eq(1) .swiper.w-dyn-list',
        itemSelector: '.swiper-slide.w-dyn-item',
        linkSelector: 'a.blog-swiper-link-blovk-cover',
        mappings: {
          'Name': { selector: '.swiper-heading-two', attr: 'text' },
          'Main Image': { selector: 'img.slider-pill_photo', attr: 'src' }
        }
      }
    ]
  },
  {
    name: 'Works',
    csv: 'cms-data/DESIGNSIMPLY - Works - 675d6f062f799cf7e40c3875.csv',
    template: 'detail_works.html',
    outDir: 'work',
    mappings: {
      'Name': { selector: '.main-name-heading', attr: 'text' },
      'project type': { selector: '.project-type', attr: 'text' },
      'intoduction headline': { selector: '.introduction-heading', attr: 'text' },
      'the task title': { selector: '.work-template-task-heading', attr: 'text' },
      'the task': { selector: '.work-template-task-goal', attr: 'text' },
      'the task description': { selector: '.work-template-task-text', attr: 'text' },
      'Sort Order 1 Image': { selector: '.works-template-page-hero img, .work-template-first-image', attr: 'src' },
      'Sort Order 2 Image': { selector: '.work-template-second-image', attr: 'src' },
      'Sort Order 3 Image': { selector: '.work-template-third-image-container', attr: 'src' },
    },
    indexPages: [
      {
        file: 'work/work.html',
        listSelector: '.work-small-card-list',
        itemSelector: '.work-small-card-item',
        linkSelector: 'a.work-small-card',
        mappings: {
          'Name': { selector: '.work-text-size', attr: 'text' },
          'Sort Order 1 Image': { selector: '.big-card-image img', attr: 'src' },
          'Video': { selector: '.big-card-image video source', attr: 'src' }
        }
      },
      {
        file: 'index.html',
        listSelector: 'section.section-2.is--slider .splide__track.w-dyn-list',
        itemSelector: '.splide__slide.w-dyn-item',
        linkSelector: 'a.works-slider-link-block.workss',
        mappings: {
          'Name': { selector: '.works-slider-title.workies-slider', attr: 'text' },
          'Sort Order 1 Image': { selector: 'img.image-8', attr: 'src' }
        }
      },
      {
        file: 'index.html',
        listSelector: '.container-9:eq(0) .swiper.w-dyn-list',
        itemSelector: '.swiper-slide.w-dyn-item',
        linkSelector: 'a.link-block-2',
        mappings: {
          'Name': { selector: 'h1.heading-23', attr: 'text' },
          'Sort Order 1 Image': { selector: 'img.slider-pill_photo', attr: 'src' }
        }
      },
      {
        file: 'detail_works.html',
        listSelector: '.collection-list-wrapper-4.w-dyn-list',
        itemSelector: '.more-works-collection-item.w-dyn-item',
        linkSelector: 'a.more-works-link-block',
        mappings: {
          'Name': { selector: '.more-works-title-text', attr: 'text' },
          'Sort Order 1 Image': { selector: 'img.more-works-card-image', attr: 'src' }
        }
      }
    ]
  }
];

function build() {
  collections.forEach(collection => {
    if (!fs.existsSync(collection.csv)) {
      console.log(`Skipping ${collection.name}: CSV not found at ${collection.csv}`);
      return;
    }

    if (!fs.existsSync(collection.outDir)) {
      fs.mkdirSync(collection.outDir, { recursive: true });
    }

    console.log(`Building collection: ${collection.name}`);
    const csvData = fs.readFileSync(collection.csv, 'utf8');
    const records = parse(csvData, { columns: true, skip_empty_lines: true });

    // 1. Prepare all index pages
    const indexes = [];
    const loadedFiles = {}; // Cache to prevent overwriting when multiple lists are on the same page

    if (collection.indexPages) {
      collection.indexPages.forEach(idx => {
        if (!fs.existsSync(idx.file)) return;
        
        if (!loadedFiles[idx.file]) {
          const html = fs.readFileSync(idx.file, 'utf8');
          loadedFiles[idx.file] = cheerio.load(html);
        }
        
        const $index = loadedFiles[idx.file];
        const $list = $index(idx.listSelector);
        if ($list.length === 0) {
          console.log(`    ! List not found: ${idx.listSelector} in ${idx.file}`);
          return;
        }
        
        let $itemsWrapper = $list.find('.w-dyn-items');
        if ($list.hasClass('w-dyn-items')) {
           $itemsWrapper = $list;
        }
        
        if ($itemsWrapper.length === 0) {
          console.log(`    ! Wrapper not found for: ${idx.listSelector}`);
          return;
        }
        
        console.log(`    Found list: ${idx.listSelector}`);
        const $templateItem = $itemsWrapper.find(idx.itemSelector).first().clone();
        
        // Empty only the items wrapper, not the entire list (preserves slider structure)
        $itemsWrapper.empty();
        $list.find('.w-dyn-empty').remove();
        
        indexes.push({ idx, $index, $templateItem, $itemsWrapper, file: idx.file });
      });
    }

    // 2. Populate index pages in memory
    records.forEach(row => {
      if (row['Draft'] === 'true' || row['Archived'] === 'true') return;
      const slug = row['Slug'] || row['Name'].toLowerCase().replace(/\\s+/g, '-');
      
      indexes.forEach(i => {
        const { idx, $index, $templateItem } = i;
        if (!$templateItem) return;
        
        const $item = $templateItem.clone();
        
        // Determine correct relative path from the index page to the detail page
        let prefix = '';
        if (i.file.includes('/')) prefix = '../'; // e.g. others/blog.html
        
        const linkHref = `${prefix}${collection.outDir}/${slug}.html`;
        $item.find(idx.linkSelector).attr('href', linkHref);
        
        for (const [column, rule] of Object.entries(idx.mappings)) {
           if (row[column] && row[column].trim() !== '') {
             if (rule.attr === 'text') {
               $item.find(rule.selector).text(row[column]);
             } else if (rule.attr === 'src') {
               $item.find(rule.selector).attr('src', row[column]);
               $item.find(rule.selector).removeAttr('srcset');
             }
           }
        }
        $item.find('.w-dyn-bind-empty').removeClass('w-dyn-bind-empty');
        i.$itemsWrapper.append($item);
      });
    });

    // 3. Save index pages to disk (Only save each file once)
    const savedFiles = new Set();
    indexes.forEach(i => {
       if (!savedFiles.has(i.file)) {
         fs.writeFileSync(i.file, i.$index.html());
         console.log(`  -> Updated Index: ${i.file}`);
         savedFiles.add(i.file);
       }
    });

    // 4. NOW read the template for detail pages (it may have been updated in step 3!)
    if (!fs.existsSync(collection.template)) {
      console.log(`Skipping ${collection.name}: Template not found at ${collection.template}`);
      return;
    }
    const templateHtml = fs.readFileSync(collection.template, 'utf8');

    // 5. Generate detail pages
    records.forEach(row => {
      if (row['Draft'] === 'true' || row['Archived'] === 'true') return;
      const slug = row['Slug'] || row['Name'].toLowerCase().replace(/\\s+/g, '-');
      const outputPath = path.join(collection.outDir, `${slug}.html`);

      const $ = cheerio.load(templateHtml);
      for (const [column, rule] of Object.entries(collection.mappings)) {
        if (row[column] && row[column].trim() !== '') {
          if (rule.attr === 'text') {
            $(rule.selector).text(row[column]);
          } else if (rule.attr === 'html') {
            $(rule.selector).html(row[column]);
          } else if (rule.attr === 'src') {
            $(rule.selector).attr('src', row[column]);
            $(rule.selector).removeAttr('srcset');
          }
        }
      }
      $('.w-dyn-bind-empty').removeClass('w-dyn-bind-empty');

      // Fix relative paths for files in subdirectories
      $('[href]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('#') && !href.startsWith('/') && !href.startsWith('mailto:')) {
          if (!href.startsWith('../')) $(el).attr('href', '../' + href);
        }
      });
      $('[src]').each((i, el) => {
        const src = $(el).attr('src');
        if (src && !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('/') && !src.startsWith('data:')) {
          if (!src.startsWith('../')) $(el).attr('src', '../' + src);
        }
      });

      fs.writeFileSync(outputPath, $.html());
      console.log(`  -> Generated: ${outputPath}`);
    });
  });
}

build();
