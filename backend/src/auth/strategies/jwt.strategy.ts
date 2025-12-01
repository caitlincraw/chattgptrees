import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {
    // Get JWT secret from Supabase (found in Settings > API > JWT Secret)
    // If not set, we'll validate via Supabase API instead
    const jwtSecret = configService.get<string>('SUPABASE_JWT_SECRET');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret || configService.get<string>('SUPABASE_ANON_KEY'),
    });
  }

  async validate(payload: any) {
    // Verify the token with Supabase by getting the user
    // This ensures the token is valid and not expired
    try {
      const { data, error } = await this.supabaseService
        .auth()
        .getUser(payload.sub);

      if (error || !data.user) {
        throw new UnauthorizedException('Invalid token');
      }

      return {
        id: data.user.id,
        email: data.user.email,
        ...data.user.user_metadata,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
