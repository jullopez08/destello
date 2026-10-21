import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { createOrganizationWithOwner, freeSlug } from '../organizations/create-organization';
import { StartSignupDto, VerifySignupDto } from './dto/signup.dto';
import { CODE_MINUTES, MAX_CODE_ATTEMPTS, RESEND_WAIT_MS, codeMatches, findUsLink, hashCode, isPdf, newCode, phoneDisplay, phoneKey, signupMode } from './signup-rules';

const STALE_MS = 24 * 60 * 60 * 1000;

// Inscripción por la página: la dueña llena el formulario, recibe un código en
// el correo y al escribirlo nace su negocio con la prueba gratis (sin tarjeta).
// Una prueba por correo y por WhatsApp. SIGNUP_MODE decide si entra sola.
@Injectable()
export class SignupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  get mode() {
    return signupMode(this.config.get<string>('SIGNUP_MODE'));
  }

  async start(dto: StartSignupDto, menu?: Express.Multer.File) {
    if (this.mode === 'closed') throw new ForbiddenException('La inscripción está cerrada por ahora. Escríbenos por WhatsApp.');
    const email = dto.email.trim().toLowerCase();
    const whatsapp = phoneKey(dto.whatsapp);
    await this.assertAvailable(email, whatsapp);
    // Para comprobar que el negocio es real (Julieth, 2026-10-20): dónde encontrarlo y su carta en PDF.
    const findUs = findUsLink(dto.findUs);
    if (!findUs) throw new BadRequestException('Escribe el usuario de Instagram (@tunegocio) o el enlace de Google Maps de tu negocio.');
    if (!menu) throw new BadRequestException('Sube la carta de tu negocio en PDF.');
    if (!isPdf(menu.buffer)) throw new BadRequestException('La carta debe ser un archivo PDF.');

    // Las solicitudes viejas sin terminar no se guardan: tienen datos personales.
    await this.prisma.signupRequest.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - STALE_MS) } } });
    const previous = await this.prisma.signupRequest.findUnique({ where: { email } });
    if (previous && Date.now() - previous.createdAt.getTime() < RESEND_WAIT_MS) {
      throw new BadRequestException('Ya te enviamos un código. Espera un minuto para pedir otro.');
    }

    const code = newCode();
    const data = {
      email,
      whatsapp,
      ownerName: dto.ownerName.trim(),
      businessName: dto.businessName.trim(),
      servesTables: dto.servesTables,
      passwordHash: await bcrypt.hash(dto.password, 10),
      termsVersion: dto.termsVersion,
      findUs,
      menuName: (menu.originalname || 'carta.pdf').slice(0, 120),
      menuPdf: Uint8Array.from(menu.buffer),
      codeHash: hashCode(code),
      codeExpiresAt: new Date(Date.now() + CODE_MINUTES * 60 * 1000),
      attempts: 0,
      createdAt: new Date(),
    };
    await this.prisma.signupRequest.upsert({ where: { email }, create: data, update: data });
    await this.email.sendSignupCode(email, code, CODE_MINUTES);
    return { email, minutes: CODE_MINUTES };
  }

  /** Devuelve la dueña recién creada (el controlador le abre la sesión). */
  async verify(dto: VerifySignupDto) {
    if (this.mode === 'closed') throw new ForbiddenException('La inscripción está cerrada por ahora. Escríbenos por WhatsApp.');
    const email = dto.email.trim().toLowerCase();
    const request = await this.prisma.signupRequest.findUnique({ where: { email } });
    if (!request || request.codeExpiresAt < new Date()) throw new BadRequestException('El código venció. Pide uno nuevo.');
    if (request.attempts >= MAX_CODE_ATTEMPTS) throw new BadRequestException('Demasiados intentos. Pide un código nuevo.');
    if (!codeMatches(dto.code, request.codeHash)) {
      await this.prisma.signupRequest.update({ where: { email }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('El código no coincide. Revísalo en tu correo.');
    }

    await this.assertAvailable(email, request.whatsapp);
    const plan = await this.prisma.plan.findFirst({ where: { isTrial: true, active: true }, orderBy: { createdAt: 'asc' } });
    if (!plan) throw new BadRequestException('La prueba gratis no está disponible. Escríbenos por WhatsApp.');

    return this.prisma.$transaction(async (tx) => {
      const { owner, organization } = await createOrganizationWithOwner(tx, {
        name: request.businessName,
        slug: await freeSlug(tx, request.businessName),
        servesTables: request.servesTables,
        whatsapp: phoneDisplay(request.whatsapp),
        approvalPending: this.mode === 'review',
        plan,
        owner: { name: request.ownerName, email, passwordHash: request.passwordHash, termsVersion: request.termsVersion },
      });
      await tx.organization.update({ where: { id: organization.id }, data: { findUs: request.findUs || null } });
      if (request.menuPdf) {
        await tx.businessMenu.create({ data: { organizationId: organization.id, name: request.menuName ?? 'carta.pdf', size: request.menuPdf.length, data: request.menuPdf } });
      }
      await tx.signupRequest.delete({ where: { email } });
      return owner;
    });
  }

  private async assertAvailable(email: string, whatsapp: string) {
    if (whatsapp.length < 10) throw new BadRequestException('Escribe el WhatsApp del negocio con sus 10 dígitos.');
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('Ya existe una cuenta con ese correo. Entra o recupera tu contraseña.');
    }
    const taken = await this.prisma.$queryRaw<unknown[]>`
      SELECT 1 FROM "Organization" WHERE right(regexp_replace(coalesce(whatsapp, ''), '\\D', '', 'g'), 10) = ${whatsapp} LIMIT 1`;
    if (taken.length) throw new BadRequestException('Ese WhatsApp ya tiene una cuenta en Destello. Entra con su correo.');
  }
}
