import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseCursorPipe implements PipeTransform<string, string | undefined> {
  transform(value: string): string | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    // Basic cursor validation - should be base64 encoded
    try {
      const decoded = Buffer.from(value, 'base64').toString('utf-8');
      if (!decoded || decoded.length === 0) {
        throw new BadRequestException('Invalid cursor format');
      }
      return value;
    } catch {
      throw new BadRequestException('Invalid cursor format');
    }
  }
}
