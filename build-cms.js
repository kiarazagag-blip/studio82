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
    indexPage: {
      file: 'others/blog.html',
      listSelector: '.blog-page-collection-list',
      itemSelector: '.blog-page-collection-item',
      linkSelector: 'a.blog-small-card',
      mappings: {
        'Name': { selector: '.blog-page-card-main-title', attr: 'text' },
        'Main Image': { selector: '.blog-image-main-picture img', attr: 'src' }
      }
    }
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
    indexPage: {
      file: 'work/work.html',
      listSelector: '.work-small-card-list',
      itemSelector: '.work-small-card-item',
      linkSelector: 'a.work-small-card',
      mappings: {
        'Name': { selector: '.work-text-size', attr: 'text' },
        'Sort Order 1 Image': { selector: '.big-card-image img', attr: 'src' },
        'Video': { selector: '.big-card-image video source', attr: 'src' }
      }
    }
  }
];

function build() {
  collections.forEach(collection => {
    if (!fs.existsSync(collection.csv)) {
      console.log(`Skipping ${collection.name}: CSV not found at ${collection.csv}`);
      return;
    }

    if (!fs.existsSync(collection.template)) {
      console.log(`Skipping ${collection.name}: Template not found at ${collection.template}`);
      return;
    }

    if (!fs.existsSync(collection.outDir)) {
      fs.mkdirSync(collection.outDir, { recursive: true });
    }

    console.log(`Building collection: ${collection.name}`);
    const csvData = fs.readFileSync(collection.csv, 'utf8');
    const records = parse(csvData, { columns: true, skip_empty_lines: true });

    const templateHtml = fs.readFileSync(collection.template, 'utf8');
    
    let indexHtml = null;
    let $index = null;
    let $templateItem = null;
    
    if (collection.indexPage && fs.existsSync(collection.indexPage.file)) {
      indexHtml = fs.readFileSync(collection.indexPage.file, 'utf8');
      $index = cheerio.load(indexHtml);
      const $list = $index(collection.indexPage.listSelector);
      $templateItem = $list.find(collection.indexPage.itemSelector).first().clone();
      
      // Clear the original list items and empty states
      $list.empty();
      $index('.w-dyn-empty').remove();
    }

    records.forEach(row => {
      // Skip drafted or archived items if present in CSV
      if (row['Draft'] === 'true' || row['Archived'] === 'true') return;
      const slug = row['Slug'] || row['Name'].toLowerCase().replace(/\s+/g, '-');
      const outputPath = path.join(collection.outDir, `${slug}.html`);

      // --- GENERATE DETAIL PAGE ---
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
      // Clean up Webflow empty bindings
      $('.w-dyn-bind-empty').removeClass('w-dyn-bind-empty');

      // Fix relative paths (CSS, JS, Images, Links) since this file is inside a subfolder
      $('[href]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('#') && !href.startsWith('/') && !href.startsWith('mailto:')) {
          // Check if it already has ../ (e.g. if the template was already in a subfolder like others/)
          if (!href.startsWith('../')) {
            $(el).attr('href', '../' + href);
          }
        }
      });
      $('[src]').each((i, el) => {
        const src = $(el).attr('src');
        if (src && !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('/') && !src.startsWith('data:')) {
          if (!src.startsWith('../')) {
            $(el).attr('src', '../' + src);
          }
        }
      });

      fs.writeFileSync(outputPath, $.html());
      console.log(`  -> Generated: ${outputPath}`);

      // --- INJECT INTO INDEX PAGE ---
      if ($index && $templateItem) {
        const $item = $templateItem.clone();
        
        // Link to detail page
        // Determine correct relative path from the index page to the detail page
        // blog.html is in 'others/' -> detail page is '../blog/slug.html'
        // work.html is in 'work/' -> detail page is '../work/slug.html'
        const linkHref = `../${collection.outDir}/${slug}.html`;
        $item.find(collection.indexPage.linkSelector).attr('href', linkHref);
        
        for (const [column, rule] of Object.entries(collection.indexPage.mappings)) {
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
        $index(collection.indexPage.listSelector).append($item);
      }
    });
    
    // Save the modified index page back to disk
    if ($index) {
       fs.writeFileSync(collection.indexPage.file, $index.html());
       console.log(`  -> Updated Index: ${collection.indexPage.file}`);
    }
  });
}

build();
