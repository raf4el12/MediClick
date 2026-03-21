import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templatesDir: string;
  private readonly cache = new Map<string, Handlebars.TemplateDelegate>();

  constructor() {
    this.templatesDir = path.join(__dirname, 'templates');
    this.registerPartials();
    this.registerHelpers();
  }

  private registerPartials(): void {
    const layoutsDir = path.join(this.templatesDir, 'layouts');
    if (!fs.existsSync(layoutsDir)) return;

    const files = fs.readdirSync(layoutsDir).filter((f) => f.endsWith('.hbs'));
    for (const file of files) {
      const name = path.basename(file, '.hbs');
      const content = fs.readFileSync(path.join(layoutsDir, file), 'utf-8');
      Handlebars.registerPartial(name, content);
      this.logger.log(`Registered partial: ${name}`);
    }
  }

  private registerHelpers(): void {
    Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
    Handlebars.registerHelper('year', () => new Date().getFullYear());
    Handlebars.registerHelper(
      'formatDate',
      (date: Date | string, timezone: string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return new Intl.DateTimeFormat('es-PE', {
          timeZone: timezone || 'America/Lima',
          dateStyle: 'long',
        }).format(d);
      },
    );
    Handlebars.registerHelper(
      'formatTime',
      (date: Date | string, timezone: string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return new Intl.DateTimeFormat('es-PE', {
          timeZone: timezone || 'America/Lima',
          timeStyle: 'short',
          hour12: true,
        }).format(d);
      },
    );
  }

  compile(templateName: string, context: Record<string, unknown>): string {
    let template = this.cache.get(templateName);

    if (!template) {
      const filePath = path.join(this.templatesDir, `${templateName}.hbs`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Template not found: ${templateName}`);
      }
      const source = fs.readFileSync(filePath, 'utf-8');
      template = Handlebars.compile(source);
      this.cache.set(templateName, template);
    }

    return template(context);
  }
}
