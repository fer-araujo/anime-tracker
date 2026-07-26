export const metadata = {
  title: "Aviso de Privacidad — Anime Tracker",
  description:
    "Aviso de privacidad de Anime Tracker. Conoce cómo recopilamos, usamos y protegemos tus datos personales conforme a la LFPDPPP mexicana.",
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground max-w-none">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
        Aviso de Privacidad
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Última actualización: <time dateTime="2026-07-26">26 de julio de 2026</time>
      </p>

      <section aria-labelledby="section-controller">
        <h2 id="section-controller" className="text-xl font-semibold mt-10 mb-4">
          1. Identidad y Domicilio del Responsable
        </h2>
        <p>
          Anime Tracker (en adelante, &quot;el Responsable&quot;) es una plataforma
          operada por un desarrollador independiente. Para efectos del presente
          aviso, el Responsable puede ser contactado en:
        </p>
        <p className="text-primary font-medium">
          contacto@animetracker.com
        </p>
        <p>
          Domicilio: México. La plataforma no tiene una dirección física
          comercial; el único medio de contacto es el correo electrónico
          señalado anteriormente.
        </p>
      </section>

      <section aria-labelledby="section-data">
        <h2 id="section-data" className="text-xl font-semibold mt-10 mb-4">
          2. Datos Personales que Recopilamos
        </h2>
        <p>
          Durante tu uso de la Plataforma, recopilamos las siguientes categorías
          de datos personales:
        </p>
        <ul>
          <li>
            <strong>Datos de registro:</strong> dirección de correo electrónico
            y nombre de usuario. Estos datos son proporcionados directamente por
            ti al crear una cuenta.
          </li>
          <li>
            <strong>Datos de actividad:</strong> lista de animes que has visto,
            estás viendo o planeas ver, animes marcados como favoritos y
            colecciones personalizadas que hayas creado.
          </li>
          <li>
            <strong>Datos de sesión:</strong> tokens de autenticación generados
            al iniciar sesión en la Plataforma.
          </li>
        </ul>
        <p>
          No recopilamos datos financieros, datos biométricos, datos de
          geolocalización precisa, ni información sensible conforme a la
          LFPDPPP.
        </p>
      </section>

      <section aria-labelledby="section-purpose">
        <h2 id="section-purpose" className="text-xl font-semibold mt-10 mb-4">
          3. Finalidades del Tratamiento
        </h2>
        <p className="font-medium text-foreground">Finalidades primarias:</p>
        <ul>
          <li>Crear y gestionar tu cuenta de usuario.</li>
          <li>
            Permitir el funcionamiento de las funcionalidades de la Plataforma:
            listas de animes, favoritos y colecciones personalizadas.
          </li>
          <li>Autenticación segura mediante Supabase Auth.</li>
          <li>
            Comunicaciones esenciales relacionadas con el servicio (cambios en
            términos, avisos de privacidad actualizados).
          </li>
        </ul>
        <p className="font-medium text-foreground mt-4">
          Finalidades secundarias (sujetas a tu consentimiento):
        </p>
        <ul>
          <li>No realizamos ninguna actividad de marketing, envío de boletines ni perfiles comerciales.</li>
        </ul>
        <p>
          <strong>No compartimos, vendemos ni transferimos tus datos personales a terceros para fines de marketing o publicidad.</strong>
        </p>
      </section>

      <section aria-labelledby="section-basis">
        <h2 id="section-basis" className="text-xl font-semibold mt-10 mb-4">
          4. Base Legal del Tratamiento
        </h2>
        <p>El tratamiento de tus datos personales se fundamenta en:</p>
        <ul>
          <li>
            <strong>Consentimiento (Artículos 8 y 9 de la LFPDPPP; Artículo 6.1.a del GDPR):</strong>{" "}
            al registrarte y aceptar el presente aviso de privacidad, otorgas tu
            consentimiento para el tratamiento de tus datos conforme a las
            finalidades descritas.
          </li>
          <li>
            <strong>Interés legítimo (Artículo 6.1.f del GDPR):</strong>{" "}
            el tratamiento de datos de actividad (listas, favoritos) es necesario
            para el funcionamiento básico de la Plataforma y constituye la
            esencia del servicio que solicitaste.
          </li>
        </ul>
      </section>

      <section aria-labelledby="section-storage">
        <h2 id="section-storage" className="text-xl font-semibold mt-10 mb-4">
          5. Almacenamiento y Retención de Datos
        </h2>
        <p>
          Tus datos personales se almacenan en los servidores de{" "}
          <strong>Supabase</strong>, un proveedor de backend como servicio (BaaS)
          con infraestructura en la nube. Los centros de datos de Supabase se
          encuentran en los Estados Unidos de América.
        </p>
        <p>
          Conservaremos tus datos personales mientras mantengas una cuenta activa
          en la Plataforma. Una vez que solicites la eliminación de tu cuenta,
          tus datos serán eliminados en un plazo máximo de 30 días hábiles,
          salvo que exista una obligación legal de retenerlos por un periodo
          adicional.
        </p>
      </section>

      <section aria-labelledby="section-arco">
        <h2 id="section-arco" className="text-xl font-semibold mt-10 mb-4">
          6. Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)
        </h2>
        <p>
          Conforme a la Ley Federal de Protección de Datos Personales en
          Posesión de los Particulares (LFPDPPP), tienes derecho en cualquier
          momento a:
        </p>
        <ul>
          <li>
            <strong>Acceso:</strong> conocer qué datos personales tuyos
            tenemos almacenados.
          </li>
          <li>
            <strong>Rectificación:</strong> solicitar la corrección de datos
            inexactos o incompletos.
          </li>
          <li>
            <strong>Cancelación:</strong> solicitar la eliminación de tus datos
            cuando ya no sean necesarios para las finalidades descritas.
          </li>
          <li>
            <strong>Oposición:</strong> oponerte al tratamiento de tus datos
            para fines específicos.
          </li>
        </ul>
        <p>
          Para ejercer cualquiera de estos derechos, envía una solicitud al
          correo <span className="text-primary font-medium">contacto@animetracker.com</span>{" "}
          indicando tu nombre de usuario y el derecho que deseas ejercer. Te
          responderemos en un plazo máximo de 20 días hábiles conforme a la ley.
        </p>
        <p>
          Adicionalmente, si eres residente de la Unión Europea, cuentas con
          los derechos establecidos en el GDPR, incluyendo el derecho a la
          portabilidad de datos y a presentar una reclamación ante tu autoridad
          de control.
        </p>
      </section>

      <section aria-labelledby="section-cookies">
        <h2 id="section-cookies" className="text-xl font-semibold mt-10 mb-4">
          7. Cookies y Tecnologías de Seguimiento
        </h2>
        <p>
          Anime Tracker utiliza únicamente <strong>cookies de sesión</strong>{" "}
          estrictamente necesarias para el funcionamiento de la autenticación
          mediante Supabase Auth. Estas cookies se eliminan automáticamente al
          cerrar el navegador.
        </p>
        <p>
          <strong>No utilizamos cookies de rastreo, cookies publicitarias, cookies de terceros ni tecnologías de seguimiento</strong>{" "}
          como Google Analytics, Facebook Pixel o similares.
        </p>
      </section>

      <section aria-labelledby="section-third-parties">
        <h2 id="section-third-parties" className="text-xl font-semibold mt-10 mb-4">
          8. Servicios de Terceros
        </h2>
        <p>
          Para el funcionamiento de la Plataforma, utilizamos los siguientes
          servicios de terceros:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> — Proveedor de autenticación y base de
            datos. Almacena tu correo electrónico, nombre de usuario, hash de
            contraseña y datos de actividad.{" "}
            <a
              href="https://supabase.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Política de privacidad de Supabase
            </a>
          </li>
          <li>
            <strong>AniList API</strong> — Obtención de datos de anime y manga.
            No se envían datos personales a AniList.{" "}
            <a
              href="https://anilist.co/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Términos de AniList
            </a>
          </li>
          <li>
            <strong>TMDB API (The Movie Database)</strong> — Obtención de
            metadatos audiovisuales. No se envían datos personales a TMDB.{" "}
            <a
              href="https://www.themoviedb.org/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Política de privacidad de TMDB
            </a>
          </li>
        </ul>
      </section>

      <section aria-labelledby="section-minors">
        <h2 id="section-minors" className="text-xl font-semibold mt-10 mb-4">
          9. Menores de Edad
        </h2>
        <p>
          La Plataforma no está dirigida a menores de 13 años. No recopilamos
          intencionadamente datos personales de niños menores de 13 años. Si
          descubrimos que hemos recopilado datos de un menor sin el
          consentimiento verificable de sus padres o tutores, eliminaremos dicha
          información lo antes posible.
        </p>
      </section>

      <section aria-labelledby="section-transfers">
        <h2 id="section-transfers" className="text-xl font-semibold mt-10 mb-4">
          10. Transferencias Internacionales de Datos
        </h2>
        <p>
          Tus datos personales son almacenados en servidores ubicados en los
          Estados Unidos de América a través de Supabase. Para usuarios mexicanos,
          esta transferencia se realiza conforme al Artículo 37 de la LFPDPPP,
          informándote que tus datos serán sujetos a las leyes de dicho país.
        </p>
        <p>
          Para usuarios europeos, informamos que Estados Unidos no cuenta con una
          decisión de adecuación vigente de la Comisión Europea. La transferencia
          se ampara en las Cláusulas Contractuales Tipo (SCC) adoptadas por
          Supabase, así como en tu consentimiento explícito al aceptar este aviso.
        </p>
      </section>

      <section aria-labelledby="section-security">
        <h2 id="section-security" className="text-xl font-semibold mt-10 mb-4">
          11. Medidas de Seguridad
        </h2>
        <p>
          Implementamos las siguientes medidas para proteger tus datos personales
          contra acceso no autorizado, pérdida o alteración:
        </p>
        <ul>
          <li>Cifrado en tránsito mediante TLS/SSL para todas las comunicaciones.</li>
          <li>Almacenamiento de contraseñas con hash (bcrypt) a través de Supabase Auth.</li>
          <li>Autenticación segura mediante tokens JWT con expiración.</li>
          <li>Políticas de seguridad a nivel de base de datos (Row Level Security) en Supabase.</li>
          <li>Acceso restringido a la infraestructura únicamente al desarrollador responsable.</li>
        </ul>
      </section>

      <section aria-labelledby="section-changes">
        <h2 id="section-changes" className="text-xl font-semibold mt-10 mb-4">
          12. Cambios al Aviso de Privacidad
        </h2>
        <p>
          Nos reservamos el derecho de modificar el presente aviso de privacidad
          en cualquier momento. Los cambios sustanciales serán notificados a
          través de la Plataforma y, cuando sea posible, mediante correo
          electrónico a la dirección que registraste. Te recomendamos revisar
          periódicamente esta página para mantenerte informado.
        </p>
      </section>

      <section aria-labelledby="section-consent">
        <h2 id="section-consent" className="text-xl font-semibold mt-10 mb-4">
          13. Consentimiento
        </h2>
        <p>
          Al registrarte en Anime Tracker y utilizar la Plataforma, manifestamos
          tu consentimiento informado para el tratamiento de tus datos personales
          conforme al presente aviso de privacidad, en términos de los Artículos
          8 y 9 de la LFPDPPP y, para usuarios europeos, del Artículo 7 del GDPR.
        </p>
      </section>

      <section aria-labelledby="section-contact">
        <h2 id="section-contact" className="text-xl font-semibold mt-10 mb-4">
          14. Contacto y Datos del Responsable
        </h2>
        <p>
          Para cualquier duda, aclaración o ejercicio de derechos ARCO, puedes
          contactarnos en:
        </p>
        <p className="text-primary font-medium">
          contacto@animetracker.com
        </p>
        <p className="mt-6">
          También puedes acudir al Instituto Nacional de Transparencia, Acceso a
          la Información y Protección de Datos Personales (INAI) para presentar
          una queja si consideras que tus derechos de protección de datos han
          sido vulnerados.
        </p>
      </section>
    </article>
  );
}
