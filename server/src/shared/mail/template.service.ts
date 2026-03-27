import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_TIMEZONE } from '../constants/defaults.constant.js';

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
          timeZone: timezone || DEFAULT_TIMEZONE,
          dateStyle: 'long',
        }).format(d);
      },
    );
    Handlebars.registerHelper(
      'formatTime',
      (date: Date | string, _timezone: string) => {
        // Las horas se almacenan como epoch UTC (1970-01-01THH:mm:00Z)
        // y ya representan wall-clock time, así que leemos UTC directo.
        const d = typeof date === 'string' ? new Date(date) : date;
        const h = d.getUTCHours();
        const m = d.getUTCMinutes().toString().padStart(2, '0');
        const ampm = h >= 12 ? 'p.m.' : 'a.m.';
        const h12 = h % 12 || 12;
        return `${h12}:${m} ${ampm}`;
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
