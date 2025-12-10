import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseBigIntPipe implements PipeTransform<string, bigint | undefined> {
  transform(value: string): bigint | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException(`Invalid BigInt value: ${value}`);
    }
  }
}
