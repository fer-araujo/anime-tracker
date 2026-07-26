export function PrivacyContent() {
  return (
    <>
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
        <p className="text-primary font-medium">contacto@animetracker.com</p>
        <p>
          Domicilio: México. La plataforma no tiene una dirección física
          comercial; el único medio de contacto es el correo electrónico.
        </p>
      </section>

      <section aria-labelledby="section-data">
        <h2 id="section-data" className="text-xl font-semibold mt-10 mb-4">
          2. Datos Personales que Recopilamos
        </h2>
        <ul>
          <li><strong>Datos de registro:</strong> correo electrónico y nombre de usuario.</li>
          <li><strong>Datos de actividad:</strong> lista de animes, favoritos y colecciones.</li>
          <li><strong>Datos de sesión:</strong> tokens de autenticación.</li>
        </ul>
        <p>No recopilamos datos financieros, biométricos ni de geolocalización.</p>
      </section>

      <section aria-labelledby="section-purpose">
        <h2 id="section-purpose" className="text-xl font-semibold mt-10 mb-4">
          3. Finalidades del Tratamiento
        </h2>
        <ul>
          <li>Crear y gestionar tu cuenta de usuario.</li>
          <li>Funcionamiento de listas, favoritos y colecciones.</li>
          <li>Autenticación segura mediante Supabase Auth.</li>
          <li>Comunicaciones esenciales del servicio.</li>
        </ul>
        <p><strong>No compartimos, vendemos ni transferimos tus datos a terceros para marketing.</strong></p>
      </section>

      <section aria-labelledby="section-basis">
        <h2 id="section-basis" className="text-xl font-semibold mt-10 mb-4">
          4. Base Legal del Tratamiento
        </h2>
        <ul>
          <li><strong>Consentimiento (LFPDPPP Arts. 8-9, GDPR Art. 6.1.a)</strong></li>
          <li><strong>Interés legítimo (GDPR Art. 6.1.f)</strong></li>
        </ul>
      </section>

      <section aria-labelledby="section-storage">
        <h2 id="section-storage" className="text-xl font-semibold mt-10 mb-4">
          5. Almacenamiento y Retención
        </h2>
        <p>Datos almacenados en Supabase (EE.UU.). Retención mientras la cuenta esté activa. Eliminación en 30 días tras solicitud.</p>
      </section>

      <section aria-labelledby="section-arco">
        <h2 id="section-arco" className="text-xl font-semibold mt-10 mb-4">
          6. Derechos ARCO
        </h2>
        <ul>
          <li><strong>Acceso:</strong> conocer tus datos.</li>
          <li><strong>Rectificación:</strong> corregir datos inexactos.</li>
          <li><strong>Cancelación:</strong> eliminar tus datos.</li>
          <li><strong>Oposición:</strong> oponerte al tratamiento.</li>
        </ul>
        <p>Envía tu solicitud a <span className="text-primary font-medium">contacto@animetracker.com</span>. Respuesta en 20 días hábiles.</p>
      </section>

      <section aria-labelledby="section-cookies">
        <h2 id="section-cookies" className="text-xl font-semibold mt-10 mb-4">
          7. Cookies
        </h2>
        <p>Solo cookies de sesión (Supabase Auth). Sin cookies de rastreo, publicidad o terceros.</p>
      </section>

      <section aria-labelledby="section-third-parties">
        <h2 id="section-third-parties" className="text-xl font-semibold mt-10 mb-4">
          8. Servicios de Terceros
        </h2>
        <ul>
          <li><strong>Supabase</strong> — autenticación y base de datos.</li>
          <li><strong>AniList API</strong> — datos de anime.</li>
          <li><strong>TMDB API</strong> — metadatos audiovisuales.</li>
        </ul>
      </section>

      <section aria-labelledby="section-minors">
        <h2 id="section-minors" className="text-xl font-semibold mt-10 mb-4">
          9. Menores de Edad
        </h2>
        <p>No dirigido a menores de 13 años.</p>
      </section>

      <section aria-labelledby="section-transfers">
        <h2 id="section-transfers" className="text-xl font-semibold mt-10 mb-4">
          10. Transferencias Internacionales
        </h2>
        <p>Datos en EE.UU. vía Supabase. SCC para usuarios europeos.</p>
      </section>

      <section aria-labelledby="section-security">
        <h2 id="section-security" className="text-xl font-semibold mt-10 mb-4">
          11. Medidas de Seguridad
        </h2>
        <ul>
          <li>TLS/SSL, bcrypt, JWT, Row Level Security.</li>
          <li>Acceso restringido.</li>
        </ul>
      </section>

      <section aria-labelledby="section-changes">
        <h2 id="section-changes" className="text-xl font-semibold mt-10 mb-4">
          12. Cambios al Aviso
        </h2>
        <p>Notificados por la plataforma o correo.</p>
      </section>

      <section aria-labelledby="section-consent">
        <h2 id="section-consent" className="text-xl font-semibold mt-10 mb-4">
          13. Consentimiento
        </h2>
        <p>Al registrarte, manifiestas tu consentimiento conforme a LFPDPPP y GDPR.</p>
      </section>

      <section aria-labelledby="section-contact">
        <h2 id="section-contact" className="text-xl font-semibold mt-10 mb-4">
          14. Contacto
        </h2>
        <p className="text-primary font-medium">contacto@animetracker.com</p>
        <p className="mt-6">También puedes acudir al INAI para presentar una queja.</p>
      </section>
    </>
  );
}
