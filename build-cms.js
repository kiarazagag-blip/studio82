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

    records.forEach(row => {
      // Skip drafted or archived items if present in CSV
      if (row['Draft'] === 'true' || row['Archived'] === 'true') return;

      const $ = cheerio.load(templateHtml);

      // Apply mappings
      for (const [column, rule] of Object.entries(collection.mappings)) {
        if (row[column] && row[column].trim() !== '') {
          if (rule.attr === 'text') {
            $(rule.selector).text(row[column]);
          } else if (rule.attr === 'html') {
            $(rule.selector).html(row[column]);
          } else if (rule.attr === 'src') {
            $(rule.selector).attr('src', row[column]);
            $(rule.selector).removeAttr('srcset'); // Remove webflow srcset to force new image
          }
        }
      }

      // Clean up Webflow empty bindings
      $('.w-dyn-bind-empty').removeClass('w-dyn-bind-empty');

      const slug = row['Slug'] || row['Name'].toLowerCase().replace(/\s+/g, '-');
      const outputPath = path.join(collection.outDir, `${slug}.html`);

      fs.writeFileSync(outputPath, $.html());
      console.log(`  -> Generated: ${outputPath}`);
    });
  });
}

build();
