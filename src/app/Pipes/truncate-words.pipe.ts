import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncateWords',
  standalone: true,
})
export class TruncateWordsPipe implements PipeTransform {
  transform(value: string, charLimit: number = 25): string {
    if (!value) return '';

    if (value.length <= charLimit) {
      return value;
    }

    return value.slice(0, charLimit) + '...';
  }
}
