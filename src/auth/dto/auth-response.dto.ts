export interface AuthResponseDto {
  accessToken: string;
  user: { id: number; email: string };
}
