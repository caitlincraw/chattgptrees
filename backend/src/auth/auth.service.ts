import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterDto, LoginDto, ForgotPasswordDto } from './dto';

@Injectable()
export class AuthService {
  constructor(private supabaseService: SupabaseService) {}

  async register(registerDto: RegisterDto) {
    const { email, password, fullName } = registerDto;

    const { data, error } = await this.supabaseService.auth().signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Manually create user record in public.users if it doesn't exist
    // This is a fallback in case the trigger doesn't fire immediately
    if (data.user) {
      try {
        const { error: userError } = await this.supabaseService
          .from('users')
          .upsert(
            {
              auth_user_id: data.user.id,
              email: data.user.email,
              full_name: fullName,
            },
            {
              onConflict: 'auth_user_id',
            },
          );

        if (userError) {
          console.error('Error creating user record:', userError);
          // Don't throw - auth user is created, just log the error
        }
      } catch (err) {
        console.error('Error upserting user record:', err);
        // Don't throw - auth user is created, just log the error
      }
    }

    return {
      user: data.user,
      session: data.session,
      message:
        'User registered successfully. Please check your email to verify your account.',
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const { data, error } = await this.supabaseService
      .auth()
      .signInWithPassword({
        email,
        password,
      });

    if (error) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      user: data.user,
      session: data.session,
      access_token: data.session?.access_token,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const { error } = await this.supabaseService
      .auth()
      .resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`,
      });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message: 'Password reset email sent. Please check your inbox.',
    };
  }

  async validateUser(token: string) {
    const { data, error } = await this.supabaseService.auth().getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid token');
    }

    return data.user;
  }

  async checkUserRecord(authUserId: string) {
    const { data, error } = await this.supabaseService
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();

    if (error) {
      return {
        exists: false,
        error: error.message,
      };
    }

    return {
      exists: true,
      user: data,
    };
  }
}
