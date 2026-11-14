import Link from "next/link";

// ⚠️ Cambia esto por tu nombre y un correo de contacto antes de presentar el proyecto
const CONTACTO = "[Escribe aquí el nombre y el correo de la persona responsable del proyecto]";
const ACTUALIZADO = "noviembre de 2026";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

const ul = "grid list-disc gap-1 pl-5";

export default function Privacidad() {
  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Aviso de privacidad</h1>
        <p className="mt-1 text-[var(--muted)]">
          En palabras sencillas: qué guarda Pieza a pieza, para qué, quién lo ve y qué puedes hacer.
          Actualizado en {ACTUALIZADO}.
        </p>
      </div>

      <p className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
        <strong>Importante:</strong> Pieza a pieza es un proyecto escolar. Usa datos de ejemplo, no información
        real de un menor. Este aviso es una plantilla para el proyecto y no es asesoría legal: antes de usar la
        app con datos reales, debe revisarlo un profesional del derecho de tu país.
      </p>

      <Block title="1. Qué es y quién es responsable">
        <p>
          Es una aplicación para que la familia y el equipo que acompaña a un niño (maestros, terapeutas,
          pediatra, cuidadores) compartan su seguimiento. Responsable del proyecto: {CONTACTO}.
        </p>
      </Block>

      <Block title="2. Qué datos se guardan">
        <ul className={ul}>
          <li>
            <strong>De tu cuenta:</strong> correo, nombre y, si quieres, foto o avatar, profesión, institución,
            una frase de presentación y teléfono (solo se muestra al equipo si tú lo activas).
          </li>
          <li>
            <strong>Del niño:</strong> nombre, fecha de nacimiento, sexo, grupo sanguíneo, alergias, contactos,
            medicinas (horarios, dosis registradas e inventario), otras condiciones de salud y lo que le ayuda.
          </li>
          <li>
            <strong>Del seguimiento:</strong> estados de ánimo, observaciones, rutinas, objetivos, calendario,
            mensajes, documentos, material de apoyo, observaciones con etiquetas y, si se quiere, hasta 3 fotos cada una.
          </li>
          <li>
            <strong>De uso:</strong> un historial de accesos y cambios (qué ocurrió, quién y cuándo, nunca los
            contenidos) y tus ajustes de apariencia.
          </li>
        </ul>
      </Block>

      <Block title="3. Para qué se usan">
        <p>
          Solo para coordinar el acompañamiento del niño dentro del equipo. No se usan para publicidad, no se
          venden y no se comparten con terceros ajenos al equipo.
        </p>
      </Block>

      <Block title="4. Quién ve qué">
        <ul className={ul}>
          <li>
            <strong>La familia</strong> ve todo y decide los permisos.
          </li>
          <li>
            <strong>Alergias y contactos de emergencia</strong> los ve siempre todo el equipo, por seguridad.
          </li>
          <li>
            <strong>Medicinas y otras condiciones:</strong> por defecto solo pediatra, terapeuta y logopeda; la
            familia puede abrirlo o cerrarlo por rol.
          </li>
          <li>
            <strong>Documentos:</strong> cada carpeta tiene sus permisos de ver y de subir.
          </li>
          <li>
            <strong>Observaciones, mensajes, rutinas y calendario:</strong> el equipo.
          </li>
                    <li>
            <strong>La Zona de niños</strong> no muestra medicinas, mensajes, documentos ni la ficha: solo las
            rutinas de hoy y actividades.
          </li>
          <li>
            <strong>El informe para el pediatra</strong> lo genera solo la familia y lo comparte por su cuenta.
          </li>
        </ul>
        <p>Estas reglas las hace cumplir la base de datos, no solo la pantalla.</p>
      </Block>

      <Block title="5. Cómo se protegen">
        <ul className={ul}>
          <li>La conexión va cifrada (HTTPS) y cada persona entra con su propia cuenta.</li>
          <li>Los archivos están en almacenes privados y se abren con enlaces que duran 5 minutos.</li>
          <li>Las fotos se redibujan antes de subirse, y así pierden su ubicación y datos ocultos.</li>
          <li>El historial de accesos y cambios lo ve el familiar principal.</li>
          <li>Los datos viven en un servicio de base de datos en la nube, y el sitio se publica en GitHub Pages.</li>
        </ul>
      </Block>

      <Block title="6. Límites que debes conocer">
        <ul className={ul}>
          <li>No hay cifrado de extremo a extremo: quien administra la base de datos podría, técnicamente, acceder a ella.</li>
          <li>
            La copia de la ficha de emergencia en tu dispositivo no está cifrada. Se borra al cerrar sesión.
          </li>
          <li>Los PDF se guardan tal cual y pueden conservar datos ocultos propios. No se revisan con antivirus.</li>
          <li>
            La apertura de documentos la anota la app; una persona con conocimientos técnicos y con permiso para
            verlos podría evitarlo. Los accesos a la ficha de emergencia sin conexión no quedan anotados.
          </li>
          <li>
            La app es un registro y un recordatorio. No da consejo médico, no sugiere dosis y no sustituye a un
            profesional de la salud ni una alarma propia.
          </li>
                    <li>
            El PIN de la Zona de niños se guarda en el dispositivo y evita salidas accidentales, pero no es una
            cerradura.
          </li>
        </ul>
      </Block>

      <Block title="7. Cuánto tiempo se conservan">
        <ul className={ul}>
          <li>Mientras exista el espacio, o hasta que lo borres.</li>
          <li>El historial de accesos y cambios, 12 meses (el familiar principal puede borrar lo anterior).</li>
          <li>
            Al eliminar un espacio se borran sus datos y sus archivos. Las copias de seguridad del proveedor
            podrían conservarlos un tiempo.
          </li>
        </ul>
      </Block>

      <Block title="8. Tus derechos y cómo ejercerlos aquí">
        <ul className={ul}>
          <li>
            <strong>Ver y corregir:</strong> en la Ficha, tu Perfil y cada sección (la familia edita la ficha).
          </li>
          <li>
            <strong>Llevarte tus datos:</strong> en <Link href="/datos" className="font-semibold text-[var(--primary)] hover:underline">Datos y privacidad</Link>, puedes exportar los tuyos, y el familiar principal los del espacio.
          </li>
          <li>
            <strong>Borrar:</strong> el familiar principal puede eliminar el espacio; cualquier persona puede salir
            de un equipo y cerrar sesión en todos sus dispositivos.
          </li>
          <li>
            <strong>Borrar tu cuenta de acceso por completo</strong> todavía no se puede hacer desde la app: pídelo a{" "}
            {CONTACTO}.
          </li>
        </ul>
      </Block>

      <Block title="9. Datos de menores">
        <p>
          La ficha del niño solo se activa cuando la familia confirma ser madre, padre o tutor legal y autoriza
          guardar los datos. Esa confirmación queda registrada con su fecha.
        </p>
      </Block>

      <Block title="10. Cambios y contacto">
        <p>
          Si este aviso cambia, se actualizará la fecha de arriba. Dudas o solicitudes: {CONTACTO}.
        </p>
      </Block>
    </div>
  );
}