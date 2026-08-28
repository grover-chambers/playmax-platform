import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("org.jetbrains.kotlin.android")
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.marketlink.niceos_app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "ke.co.marketlink.kaninifield"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = 24
        targetSdk = 35
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // Sign with a real upload keystore (release-keystore.jks referenced
            // from android/key.properties, or overridden by KEYSTORE_* env vars
            // in CI). Falls back to the debug key so a plain `flutter build apk
            // --release` still works on machines without a keystore.
            val keyPropsFile = rootProject.file("key.properties")
            val keyProps = Properties().apply {
                if (keyPropsFile.exists()) keyPropsFile.inputStream().use { load(it) }
            }
            val keystorePath = System.getenv("KEYSTORE_PATH")
                ?: keyProps.getProperty("storeFile")?.let { rootProject.file(it).absolutePath }
            val useReleaseSigning = !keystorePath.isNullOrBlank() && file(keystorePath).exists()

            if (useReleaseSigning) {
                signingConfig = signingConfigs.create("release").apply {
                    storeFile = file(keystorePath)
                    storePassword = System.getenv("KEYSTORE_PASSWORD") ?: keyProps.getProperty("storePassword")
                    keyAlias = System.getenv("KEY_ALIAS") ?: keyProps.getProperty("keyAlias")
                    keyPassword = System.getenv("KEY_PASSWORD") ?: keyProps.getProperty("keyPassword")
                }
            } else {
                signingConfig = signingConfigs.getByName("debug")
            }
        }
    }
}

flutter {
    source = "../.."
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}
