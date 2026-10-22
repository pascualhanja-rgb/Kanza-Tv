import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'P@sswordSegura123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password deve ter pelo menos 8 caracteres' })
  @Matches(/(?=.*[a-zA-Z])(?=.*\d)/, {
    message: 'Password deve ter pelo menos uma letra e um número',
  })
  @MaxLength(255)
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;

  @ApiProperty({ example: 'P@sswordSegura123' })
  @IsString()
  password!: string;
}
