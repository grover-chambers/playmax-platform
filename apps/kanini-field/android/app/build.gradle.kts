import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("org.jetbrains.kotlin.android")
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.marketlink.niceos_app"
    compileSdk = 36
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
            // Fail-closed: release must be signed with real keystore. Provide via
            // KEYSTORE_PATH env / KEYSTORE_* env vars or gradle property KEYSTORE_STORE_FILE
            // or android/key.properties. No silent debug fallback for release.
            val keyPropsFile = rootProject.file("key.properties")
            val keyProps = Properties().apply {
                if (keyPropsFile.exists()) keyPropsFile.inputStream().use { load(it) }
            }
            val keystorePath = System.getenv("KEYSTORE_PATH")
                ?: (project.findProperty("KEYSTORE_STORE_FILE") as String?)
                ?: keyProps.getProperty("storeFile")?.let { rootProject.file(it).absolutePath }
            val hasKeystore = !keystorePath.isNullOrBlank() && file(keystorePath).exists()

            if (hasKeystore) {
                signingConfig = signingConfigs.create("release").apply {
                    storeFile = file(keystorePath!!)
                    storePassword = System.getenv("KEYSTORE_PASSWORD") ?: keyProps.getProperty("storePassword") ?: (project.findProperty("KEYSTORE_STORE_PASSWORD") as String?)
                    keyAlias = System.getenv("KEY_ALIAS") ?: keyProps.getProperty("keyAlias") ?: (project.findProperty("KEYSTORE_KEY_ALIAS") as String?)
                    keyPassword = System.getenv("KEY_PASSWORD") ?: keyProps.getProperty("keyPassword") ?: (project.findProperty("KEYSTORE_KEY_PASSWORD") as String?)
                }
            } else {
                throw GradleException("Release signing keystore not configured: set KEYSTORE_PATH env or KEYSTORE_STORE_FILE gradle property or android/key.properties")
            }
        }
        debug {
            // Debug keeps default debug signing
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
